// Allows us to use ES6 in our migrations and tests.
require('babel-register');
var HDWalletProvider = require("truffle-hdwallet-provider");

const mnemonic = "kjweekwjeqlkewejqlkj two three four five six seven eight nine ten eleven twelve";
var provider = new HDWalletProvider(mnemonic, "https://rinkeby.infura.io", 0);
console.log(provider.getAddress());
module.exports = {
    networks: {
        "rinkeby": {
            network_id: 4,    // Official ropsten network id
            provider: provider, // Use our custom provider
        }
    }
};