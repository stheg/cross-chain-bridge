//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MABridge is AccessControl {
    using ECDSA for bytes32;

    event SwapInitialized(
        address indexed from,
        address indexed tokenFrom,
        uint256 indexed fromChainId,
        uint256 amount,
        address to,
        address tokenTo,
        uint256 toChainId
    );

    address private _validator;
    address private _tokenFrom;
    address private _tokenTo;
    mapping(uint256 => bool) private _handled;

    constructor(address tokenFrom, address tokenTo) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _tokenFrom = tokenFrom;
        _tokenTo = tokenTo;
    }

    function setValidator(address validator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _validator = validator;
    }

    function swap(
        uint64 amount,
        address to,
        uint256 toChainId
    ) external {
        ERC20PresetMinterPauser(_tokenFrom).burnFrom(msg.sender, amount);

        emit SwapInitialized(
            msg.sender,
            _tokenFrom,
            block.chainid,
            amount,
            to,
            _tokenTo,
            toChainId
        );
    }

    function redeem(
        uint64 nonce,
        address from,
        uint256 fromChainId,
        uint64 amount,
        bytes memory signature
    ) external {
        bytes32 msgHash = keccak256(
            abi.encode(
                nonce,
                from, _tokenFrom, fromChainId,
                amount,
                msg.sender, _tokenTo, block.chainid
            )
        );

        bytes32 withPrefix = msgHash.toEthSignedMessageHash();
        require(
            withPrefix.recover(signature) == _validator, 
            "MABridge: wrong signature"
        );
        
        uint256 key = uint256(msgHash);
        require(
            _handled[key] == false,
            "MABridge: already completed"
        );
        _handled[key] = true;
        
        ERC20PresetMinterPauser(_tokenTo).mint(msg.sender, amount);
    }
}
