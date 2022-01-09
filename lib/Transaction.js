const config = require('../config');
const bitcoin = require('bitcoinjs-lib');
const Address = require('./address');

class Transaction {
    constructor(opts) {
        this.network = config.TESTNET ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

        this.opts = opts || {};
        this.opts.type = this.opts.type || 'segwit'; // valid [legacy, segwit, native-segwit]
        this.opts.feeRate = this.opts.feeRate ? parseInt(this.opts.feeRate) : 3; // 3 satoshis per vbyte
        this.opts.estimateFee = this.opts.estimateFee || true;
    }

    setPrivateKey(key) {
        this.privateKey = key;
        this.address = new Address({}, this.privateKey);
    }


    setUnspents(unspents) {
        this.unspents = unspents || [];
        this.unspentsAmount = unspents.reduce((summ, { value }) => summ + value, 0);
    }

    setToAddress(address) {
        this.toAddress = address;
    }

    setWithdrawAmount(amount) {
        this.withdrawAmount = amount;
    }

    setChangeAddress(address) {
        if (!this.toAddress) {
            throw new Error('Please set toAddress before changeAddress using setChangeAddress.');
        }
        if (this.toAddress === address) {
            throw new Error('toAddress and changeAddress should not be same.');
        }
        this.changeAddress = address;
    }

    setTransactionFee(txnFee) {
        this.txnFee = txnFee;
        if (this.unspentsAmount > this.withdrawAmount) {
            this.changeAmount = parseInt(this.unspentsAmount - (this.withdrawAmount + this.txnFee));
        } else {
            this.changeAmount = 0;
        }
    }

    getRedeemScript() {
        if (this.address) {
            const p2sh = this.address.p2sh();
            return p2sh.redeem.output;
        } else {
            throw new Error('Set the private key using setPrivateKey method first to get the redeem script.')
        }
    }

    getFromAddress() {
        switch (this.opts.type) {
            case 'legacy':
                this.fromAddress = this.address.p2pkh().address;
                break;
            case 'segwit':
                this.fromAddress = this.address.p2sh().address;
                break;
            case 'native-segwit':
                this.fromAddress = this.address.p2wpkh().address;
                break;
        }
        return this.fromAddress;
    }

    validate() {
        if (!this.unspents) {
            throw new Error('Please set unspents output list');
        }
        if (!this.withdrawAmount) {
            throw new Error('Please set the withdraw amount.');
        }
        if (this.unspentsAmount < this.withdrawAmount) {
            throw new Error('Unpents output doesn\'t have enough amount to withdraw the requested amount.');
        }
        if (!this.toAddress) {
            throw new Error('Please set the to address using setToAddress method.');
        }
        if (!this.txnFee) {
            throw new Error('Please set the transaction fee.');
        }
    }

    psbt() {
        const psbt = new bitcoin.Psbt({ network: this.network });
        if (this.opts.type === 'legacy') {
            throw new Error('Legacy transaction is not supported yet.');
        }
        psbt.addOutput({
            address: this.toAddress,
            value: this.withdrawAmount,
        });

        for (const unspent of this.unspents) {
            let inputData = {
                hash: unspent.hash,
                index: unspent.index,
            }
            if (this.opts.type === 'legacy') {
                // nonWitnessUtxo is the prev transaction raw tx 
                inputData.nonWitnessUtxo = 'transaction_raw_hash';
            } else {
                inputData.witnessUtxo = {
                    script: Buffer.from(unspent.script, 'hex'),
                    value: unspent.value,
                };
            }
            if (this.opts.type !== 'native-segwit') {
                // redeem script is not required for native segwit transactions
                inputData.redeemScript = this.getRedeemScript();
            }
            psbt.addInput(inputData);
        }
        return psbt;
    }

    getVirtualSize() {
        if (this.unspentsAmount < this.withdrawAmount) {
            throw new Error(`Unpents output doesn\'t have enough amount to withdraw the requested amount. Unspents Available: ${this.unspentsAmount} satoshi and request withdrawal for ${this.withdrawAmount} satoshi`);
        }
        const psbt = this.psbt();
        for (let i = 0; i < this.unspents.length; i++) {
            psbt.signInput(i, this.address.keyPair);
        }

        psbt.finalizeAllInputs();
        const rawTransactions = psbt.extractTransaction();

        return rawTransactions.virtualSize() + 8; // added 8 for the change address size
    }

    finalize() {
        const psbt = this.psbt();
        if (this.changeAmount > 0) {
            if (!this.changeAddress) {
                throw new Error('Please set the changeAddress before finalize using setChangeAddress method');
            }
            // add the change address if change value is greater than 0
            psbt.addOutput({
                address: this.changeAddress,
                value: this.changeAmount,
            });
        }

        for (let i = 0; i < this.unspents.length; i++) {
            psbt.signInput(i, this.address.keyPair);
        }

        psbt.finalizeAllInputs();
        if (psbt.getFee() < this.txnFee) {
            throw new Error(`Transaction doesn't have enough fee (${psbt.getFee()} satoshi) and required fee (${this.txnFee} satoshi). So you can send upto ${parseInt(this.withdrawAmount - this.txnFee)} satoshi`);
        }

        this.tx = psbt.extractTransaction();
        return this.tx;
    }

    toHex() {
        return this.tx.toHex();
    }

}

module.exports = Transaction;
