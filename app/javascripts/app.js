// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import {default as Web3} from 'web3';
import {default as contract} from 'truffle-contract'
import {default as crypto} from 'crypto';
import {default as eccrypto} from 'eccrypto';
import {default as sjcl} from 'sjcl';
import {default as ipfs} from 'ipfs-js';
import {default as $} from 'jquery';

// Import our contract artifacts and turn them into usable abstractions.
import snapchat_artifacts from '../../build/contracts/Snapchat.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
let Snapchat = contract(snapchat_artifacts);

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

function allEvents(ev, cb) {
    ev({}, {fromBlock: '0', toBlock: 'latest'}).get((error, results) => {
        if (error) return cb(error);
        results.forEach(result => cb(null, result));
        ev().watch(cb);
    })
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
            ipfs.setProvider({host: 'localhost', port: '5001'});

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
        const publicKey = window.localStorage.getItem('pubKey');
        App.encrypt(image.src, new Buffer(hexStringToByte(publicKey))).then((enc) => {
            console.log(enc);
            const cipher = Buffer.from(enc.ciphertext).toString('hex');
            const iv = Buffer.from(enc.iv).toString('hex');
            const mac = Buffer.from(enc.mac).toString('hex');
            const ephemPublicKey = Buffer.from(enc.ephemPublicKey).toString('hex');

            const to = account;

            ipfs.add(cipher + "," + iv + "," + mac + "," + ephemPublicKey, (err, hash) => {
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
    register: function (password) {
        //generate pub, priv, encrypted priv
        const privateKey = crypto.randomBytes(32);
        const publicKey = eccrypto.getPublic(privateKey);
        const encryptedPrivate = App.encryptPriv(password, Buffer.from(privateKey).toString('hex'));
        window.localStorage.setItem('ePrivKey', encryptedPrivate);
        window.localStorage.setItem('pubKey', Buffer.from(publicKey).toString('hex'));

        snapchat.updatePubRegistry(encryptedPrivate, {from: account})
            .then((result) => {
                console.log(result);
            })
            .catch((error) => {
                console.log(error);
            });
    },
    unlock: function (password) {
        allEvents(snapchat.Photo, (error, response) => {
            const ePriv = window.localStorage.getItem('ePrivKey');
            const privateKey = App.decryptPriv(password, ePriv);
            const hash = response.args['hash'];
            $.get('http://localhost:5001/ipfs/' + hash, (data) => {
                const split = data.split(',');
                const cipher = new Buffer(hexStringToByte(split[0]));
                const _iv = new Buffer(hexStringToByte(split[1]));
                const _mac = new Buffer(hexStringToByte(split[2]));
                const pub = new Buffer(hexStringToByte(split[3]));

                const obj = {
                    ciphertext: cipher,
                    iv: _iv,
                    mac: _mac,
                    ephemPublicKey: pub
                };

                console.log(obj);

                App.decrypt(obj, privateKey).then((d) => {
                    document.write('<img src="' + d.toString() + '" width="160" height="120" />');
                }).catch((e) => {
                    console.log(e)
                });


            });
        });
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
