const Address = require('../lib/Address');

(async () => {
    try {
        const address = new Address();

        console.log('Generate Legacy Address', address.newLegacyAddress());

        console.log('Generate Segwit Address', address.newSegwitAddress());

        console.log('Generate Native Segwit Address', address.newNativeSegwitAddress());
    } catch (err) {
        console.log('err', err.message);
    }
})();
