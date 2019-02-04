import * as bip39 from 'bip39';
import * as sodium  from 'libsodium-wrappers-sumo';

import {KeyStore, StoreType} from "../../types/wallet/KeyStore";
import {Error} from "../../types/wallet/Error";
import * as CryptoUtils from "../../utils/CryptoUtils";

export namespace TezosWalletUtil {
    /**
     * Unlocks an identity supplied during the 2017 Tezos fundraiser.
     * 
     * @param {string} mnemonic Fifteen word mnemonic phrase from fundraiser PDF.
     * @param {string} email Email address from fundraiser PDF.
     * @param {string} password Password from fundraiser PDF.
     * @param {string} pkh The public key hash supposedly produced by the given mnemonic and passphrase
     * @returns {KeyStore} Wallet file
     */
    export function unlockFundraiserIdentity(
        mnemonic: string,
        email: string,
        password: string,
        pkh: string): KeyStore | Error {

        return getKeysFromMnemonicAndPassphrase(
            mnemonic,
            email + password,
            pkh,
            true,
            StoreType.Fundraiser
        )
    }

    /**
     * Generates a fifteen word mnemonic phrase using the BIP39 standard.
     */
    export function generateMnemonic(): string {
        return CryptoUtils.generateMnemonic();
    }

    /**
     * Generates a key pair based on a mnemonic.
     * 
     * @param {string} mnemonic Fifteen word memonic phrase
     * @param {string} passphrase User-supplied passphrase
     * @returns {KeyStore} Unlocked key pair
     */
    export function unlockIdentityWithMnemonic(mnemonic: string, passphrase: string): KeyStore | Error {
        return getKeysFromMnemonicAndPassphrase(
            mnemonic,
            passphrase,
            "",
            false,
            StoreType.Mnemonic
        );
    }

    /**
     * Generates keys from a user-supplied mnemonic and passphrase.
     * @param {string} mnemonic Fifteen word mnemonic phrase from fundraiser PDF.
     * @param {string} passphrase User-supplied passphrase
     * @param {string} pkh The public key hash supposedly produced by the given mnemonic and passphrase
     * @param {boolean} checkPKH Check whether presumed public key hash matches the actual public key hash
     * @param {StoreType} storeType Type of the generated key store
     * @returns {KeyStore} Generated keys
     */
    export function getKeysFromMnemonicAndPassphrase(
        mnemonic: string,
        passphrase: string,
        pkh = '',
        checkPKH = true,
        storeType: StoreType): Error | KeyStore { // TODO throw instead
        const lengthOfMnemonic = mnemonic.split(" ").length;
        if (lengthOfMnemonic !== 15) { return {error: "The mnemonic should be 15 words."}; }
        if (!bip39.validateMnemonic(mnemonic)) { return {error: "The given mnemonic could not be validated."}; }
        const seed = bip39.mnemonicToSeed(mnemonic, passphrase).slice(0, 32);
        const nonce = "";
        const key_pair = sodium.crypto_sign_seed_keypair(seed, nonce);
        const privateKey = CryptoUtils.base58CheckEncode(key_pair.privateKey, "edsk"); // TODO use TezosMessageUtil instead
        const publicKey = CryptoUtils.base58CheckEncode(key_pair.publicKey, "edpk");
        const publicKeyHash = CryptoUtils.base58CheckEncode(sodium.crypto_generichash(20, key_pair.publicKey), "tz1");
        if (checkPKH && publicKeyHash !== pkh) return {error: "The given mnemonic and passphrase do not correspond to the applied public key hash"};
        return {
            publicKey,
            privateKey,
            publicKeyHash,
            seed,
            storeType
        }
    }
}