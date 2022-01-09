const Transaction = require('../lib/Transaction');
const { estimateFee } = require('../services/feeRate');
const { listUnspentByAddressForAmount } = require('../services/unspent.js');

(async () => {
    try {
        const withdrawAmount = 9289;
        const transaction = new Transaction({ type: 'legacy' });
        transaction.setPrivateKey('cTg4X1Hzk62PrXz82XVaQGzAStnV3dpyM1KDT1gYEK4aM5YQjAg9');
        transaction.setToAddress('2N9ofr2T4MsM4QLz9mrPjvFSEoiGD4uMkFC');
        transaction.setChangeAddress('2NBTFPYjRxqSiNw8p13bAmkWXuncddDZg7b');
        transaction.setWithdrawAmount(withdrawAmount);

        const utxos = await listUnspentByAddressForAmount(transaction.getFromAddress(), withdrawAmount)
        transaction.setUnspents(utxos);

        const feeEstimate = await estimateFee(transaction.getVirtualSize(), 'regular');
        console.log('feeEstimate', feeEstimate);
        transaction.setTransactionFee(feeEstimate.txFee);

        transaction.validate();

        transaction.finalize();
        console.log(transaction.toHex());
    } catch (err) {
        console.log('err', err.message);
    }
})();
