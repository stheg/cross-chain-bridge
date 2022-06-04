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
    mapping(uint256 => bool) private _handled;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setValidator(address validator)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _validator = validator;
    }

    function swap(
        address tokenFrom,
        uint64 amount,
        address to,
        address tokenTo,
        uint256 toChainId
    ) external {
        ERC20PresetMinterPauser(tokenFrom).burnFrom(msg.sender, amount);

        emit SwapInitialized(
            msg.sender,
            tokenFrom,
            block.chainid,
            amount,
            to,
            tokenTo,
            toChainId
        );
    }

    function redeem(
        uint64 nonce,
        address from,
        address tokenFrom,
        uint256 fromChainId,
        uint64 amount,
        address tokenTo,
        bytes memory signature
    ) external {
        bytes32 msgHash = keccak256(
            abi.encode(
                nonce,
                from, tokenFrom, fromChainId,
                amount,
                msg.sender, tokenTo, block.chainid
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
        
        ERC20PresetMinterPauser(tokenTo).mint(msg.sender, amount);
    }
}
