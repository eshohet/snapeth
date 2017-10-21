pragma solidity ^0.4.15;

contract Snapchat {

  mapping (address => string) public pubKeyRegistry;
  event Photo(address indexed to, string encryptedPhoto);

  function updateRegistry(string pubKey) public {
    pubKeyRegistry[msg.sender] = pubKey;
  }

  function sendPhoto(address recipient, string photo) public {
    require(bytes(pubKeyRegistry[recipient]).length != 0);
    Photo(recipient, photo);
  }

}
