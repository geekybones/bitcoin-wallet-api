const config = require('../config');
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const tinysecp = require('tiny-secp256k1');
const ECPair = ECPairFactory(tinysecp);

class Address {
    constructor(opts, keyPair = null) {
        this.network = config.TESTNET ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
        // if keyPair is the WIF Private key, converting to keyPair object
        this.keyPair = keyPair ? typeof keyPair === 'string' ? ECPair.fromWIF(keyPair, this.network) : keyPair : ECPair.makeRandom({ network: this.network });

        this.opts = opts || {};
        this.opts.pubkey = this.keyPair.publicKey;
        this.opts.network = this.network;
    }

    newKeyPair() {
        const keyPair = ECPair.makeRandom();
        this.keyPair = keyPair;
        return keyPair;
    }

    // Pay-to-Public-Key-Hash
    p2pkh() {
        return bitcoin.payments.p2pkh(this.opts);
    }

    // Pay-to-Script-Hash
    p2sh() {
        return bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh(this.opts),
        });
    }

    // Pay-to-Witness-Public-Key-Hash
    p2wpkh() {
        return bitcoin.payments.p2wpkh(this.opts);
    }

    newLegacyAddress() {
        const { address } = this.p2pkh();
        return {
            address,
            publicKey: this.keyPair.publicKey.toString('hex'),
            privateKey: this.keyPair.toWIF()
        }
    }

    newSegwitAddress() {
        const { address } = this.p2sh();
        return {
            address,
            publicKey: this.keyPair.publicKey.toString('hex'),
            privateKey: this.keyPair.toWIF()
        }
    }

    newNativeSegwitAddress() {
        const { address } = this.p2wpkh();
        return {
            address,
            publicKey: this.keyPair.publicKey.toString('hex'),
            privateKey: this.keyPair.toWIF()
        }
    }
}

// console.log('Address', new Address().newSegwitAddress());

module.exports = Address;
