// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

// Import our contract artifacts and turn them into usable abstractions.
import snapchat_artifacts from '../../build/contracts/Snapchat.json'

// MetaCoin is our usable abstraction, which we'll use through the code below.
var Snapchat = contract(snapchat_artifacts);

// The following code is simple to show off interacting with your contracts.
// As your needs grow you will likely need to change its form and structure.
// For application bootstrapping, check out window.addEventListener below.
var accounts;
var account;
let snapchat;

window.App = {
  start: async function() {

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

  getElements: function() {
    this.camera = document.getElementsByClassName("camera")[0];
  },

  startCamera: function() {
    // get access to camera
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
          this.camera.src = window.URL.createObjectURL(stream);
          this.camera.play();
        });
    }
  },

  addEventListeners: function() {
    // take photo
    this.camera.addEventListener("click", () => {
      
      this.photo = document.createElement("canvas");
      
      // photo needs same dimensions as camera
      this.photo.width = 640;
      this.photo.height = 480;
      
      document.body.appendChild(this.photo);

      // write camera image to photo
      var context = this.photo.getContext("2d");
      context.drawImage(this.camera, 0, 0, 640, 480);
      
      // add event listener to photo
      this.photo.addEventListener("click", () => {

        // show camera and remove photo
        this.camera.style.display = "block";
        this.photo.remove();
      });
      
      // hide camera
      this.camera.style.display = "none";
    });
  }
};

window.addEventListener('load', function() {
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
