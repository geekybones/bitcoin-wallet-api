const { TESTNET } = require('../config');
const axios = require('axios');

const API_BASE = 'https://chain.so/api/v2';

const listAllUnspentByAddressChainSo = async (address) => {
    try {
        const network = TESTNET ? 'BTCTEST' : 'BTC';
        const endpoint = `${API_BASE}/get_tx_unspent/${network}/${String(address)}`;

        const { data } = await axios.get(endpoint);

        const utxos = data.data.txs.map((tx) => ({
            hash: tx.txid,
            index: tx.output_no,
            script: tx.script_hex,
            value: parseInt(parseFloat(tx.value) * 1e8), // convert to satoshi
            timestamp: tx.time,
        }));
        return {
            status: 'success',
            utxos
        };
    } catch (err) {
        const data = err?.response?.data;
        return {
            status: 'fail',
            message: err.message,
            data,
        };
    }
}

const listAllUnspentForAddresses = async (addresses) => {
    try {
        const listUnspents = {};
        for (const address of addresses) {
            const data = await listAllUnspentByAddressChainSo(address);
            if (data.status === 'success') {
                listUnspents[address] = data.utxos;
            }
        }
        return listUnspents;
    } catch (err) {
        const data = err?.response?.data;
        return {
            status: 'fail',
            message: err.message,
            data,
        };
    }
}

/**
 * 
 * @param {string} address blockchain address can be bitcoin, litecoin, dogecoin
 * @param {number} value value should be in satoshis
 * @returns 
 */
const listUnspentByAddressForAmount = async (address, value) => {
    try {
        let totalValue = 0;
        let listUnspent = [];

        const data = await listAllUnspentByAddressChainSo(address);
        if (data.status === 'success') {
            for (const unspent of data.utxos) {
                if (unspent.value > 0 && totalValue < value) {
                    listUnspent.push(unspent);
                }
                totalValue += unspent.value;
            }

            return listUnspent;
        } else {
            const message = data.data.data ? JSON.stringify(data.data.data) : data.message;
            throw new Error(`Fetch Unspents Failed with Error Message: "${message}"`)
        }
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = {
    listAllUnspentByAddressChainSo,
    listAllUnspentForAddresses,
    listUnspentByAddressForAmount,
}