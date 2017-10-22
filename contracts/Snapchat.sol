pragma solidity ^0.4.15;

contract Snapchat {

  mapping (address => string) public pubKeyRegistry;

  event Photo(address indexed to, address indexed from, string hash);

  function getPub(address receiver) public returns (string) {
    return pubKeyRegistry[receiver];
  }

  function updatePubRegistry(string pubKey) public {
    pubKeyRegistry[msg.sender] = pubKey;
  }

  function sendPhoto(address recipient, string hash) public {
    require(bytes(pubKeyRegistry[recipient]).length != 0);
    Photo(recipient, msg.sender, hash);
  }

}
