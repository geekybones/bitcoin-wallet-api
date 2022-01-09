const axios = require('axios');

const getFeeRate = async () => {
    try {
        const { data } = await axios.get('https://api.blockchain.info/mempool/fees');
        // all fee rates in satoshi
        const feeRate = {
            min: data.limits.min,
            max: data.limits.max,
            regular: data.regular,
            priority: data.priority,
        }
        return {
            status: 'success',
            data: feeRate,
        }
    } catch (err) {
        return {
            status: 'fail',
            message: err.message,
        }
    }
}

const estimateFee = async (txSize, mode = 'regular') => {
    try {
        if (txSize > 0 && ['min', 'max', 'regular', 'priority'].includes(mode)) {
            const { status, message, data } = await getFeeRate();
            if (status === 'success') {
                const feePerByte = data[mode]
                return {
                    status: 'success',
                    txFee: feePerByte * txSize,
                }
            } else {
                throw new Error(message)
            }
        } else {
            if (txSize <= 0) {
                throw new Error('Invalid Tx Size');
            } else {
                throw new Error('Invalid Fee Mode Valid Modes: [min, max, regular, priority]');
            }
        }
    } catch (err) {
        return {
            status: 'fail',
            message: err.message,
        }
    }
}

module.exports = {
    getFeeRate,
    estimateFee,
}