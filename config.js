require('dotenv').config();

const BTC_NETWORK = process.env.BTC_NETWORK;

module.exports = {
    TESTNET: BTC_NETWORK !== 'mainnet',
}