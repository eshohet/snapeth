// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract'
import {default as crypto} from 'crypto';
import {default as eccrypto} from 'eccrypto';
import {default as sjcl} from 'sjcl';
import {default as ipfs} from 'ipfs-js';

// Import our contract artifacts and turn them into usable abstractions.
import snapchat_artifacts from '../../build/contracts/Snapchat.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
let Snapchat = contract(snapchat_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.

function encrypt(text, password) {
    let cipher = crypto.createCipher('aes-256-ctr', password);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text, password) {
    let decipher = crypto.createDecipher('aes-256-ctr', password);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

function hexStringToByte(str) {
    if (!str) {
        return new Uint8Array();
    }

    let a = [];
    for (let i = 0, len = str.length; i < len; i += 2) {
        a.push(parseInt(str.substr(i, 2), 16));
    }
    return new Uint8Array(a);
}

let accounts, account, snapchat;

window.App = {

    start: async function () {

        // Bootstrap the MetaCoin abstraction for Use.
        Snapchat.setProvider(web3.currentProvider);

        // Get the initial account balance so it can be displayed.
        web3.eth.getAccounts(async function (err, accs) {
            if (err !== null) {
                alert("There was an error fetching your accounts.");
                return;
            }

            if (accs.length === 0) {
                alert("Couldn't get any accounts! Make sure your Ethereum client is configured correctly.");
                return;
            }

            accounts = accs;
            account = accounts[0];

            snapchat = await Snapchat.deployed();
        });

        this.getElements();
        this.startCamera();
        this.addEventListeners();
    },

    getElements: function () {
        this.camera = document.getElementsByClassName("camera")[0];
    },

    startCamera: function () {
        // get access to camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({video: true, audio: true})
                .then(stream => {
                    this.camera.src = window.URL.createObjectURL(stream);
                    this.camera.play();
                });
        }
    },

    addEventListeners: function () {
        // take photo
        this.camera.addEventListener("click", () => {

            this.photo = document.createElement("canvas");

            // photo needs same dimensions as camera
            this.photo.width = 160;
            this.photo.height = 120;

            document.body.appendChild(this.photo);

            // write camera image to photo
            var context = this.photo.getContext("2d");
            context.drawImage(this.camera, 0, 0, 160, 120);

            // add event listener to photo
            this.photo.addEventListener("click", () => {

                // show camera and remove photo
                this.camera.style.display = "block";
                this.photo.remove();
            });

            // hide camera
            this.camera.style.display = "none";
        });
    },
    sendPhoto: function () {
        let image = new Image();
        image.src = this.photo.toDataURL("image/png");
        const pair = App.generatePubPriv('hello');
        App.encrypt(image.src, pair.pub).then((enc) => {
            const cipher = Buffer.from(enc.ciphertext).toString('hex');
            const iv = Buffer.from(enc.iv).toString('hex');
            const mac = Buffer.from(enc.mac).toString('hex');
            const to = account;
            ipfs.setProvider({host: 'localhost', port: '5001'});
            ipfs.add(cipher + "," + iv + "," + mac, (err, hash) => {
                if (err)
                    console.log(err);
                else {
                    snapchat.sendPhoto(to, hash, {from: account})
                        .then((result) => {
                            console.log(result);
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                }
            });
        })
    },

    getPrivateKey: {
        //grabs private key from contract
    },
    generatePubPriv: function (password) {
        //generate pub, priv, encrypted priv
        const privateKey = crypto.randomBytes(32);
        const publicKey = eccrypto.getPublic(privateKey);
        const encryptedPrivate = App.encryptPriv(password, Buffer.from(privateKey).toString('hex'));
        return {
            pub: publicKey,
            priv: privateKey,
            ePriv: encryptedPrivate
        }
    },
    decryptPriv: function (password, encryptedPrivKey) {
        return new Buffer(hexStringToByte(sjcl.decrypt(password, encryptedPrivKey)));
    },
    encryptPriv: function (password, privKey) {
        return sjcl.encrypt(password, privKey);
    },
    encrypt: async function (msg, publicKey) {
        //encrypts photo
        return eccrypto.encrypt(publicKey, new Buffer(msg));
    },
    decrypt: function (msg, privateKey) {
        //decrypts photo
        return eccrypto.decrypt(privateKey, msg);
    },
};

window.addEventListener('load', function () {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    if (typeof web3 !== 'undefined') {
        // Use Mist/MetaMask's provider
        window.web3 = new Web3(web3.currentProvider);
    } else {
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }

    App.start();
});
