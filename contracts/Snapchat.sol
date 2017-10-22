pragma solidity ^0.4.15;

contract Snapchat {

  mapping (address => string) public pubKeyRegistry;
  mapping (address => string) public privKeyRegistry;

  event Photo(address indexed to, string encryptedPhoto);

  function updatePubRegistry(string pubKey) public {
    pubKeyRegistry[msg.sender] = pubKey;
  }

  function updatePrivRegistry(string encryptedPriv) public {
    privKeyRegistry[msg.sender] = encryptedPriv;
  }

  function sendPhoto(address recipient, string photo) public {
    require(bytes(pubKeyRegistry[recipient]).length != 0);
    Photo(recipient, photo);
  }

}
