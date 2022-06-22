/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature.
 *
 */

const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./block.js');
const bitcoinMessage = require('bitcoinjs-message');

class Blockchain {

    constructor() {
        this.chain = [];
        this.height = -1;
        this.initializeChain();
    }

    async initializeChain() {
        if (this.height === -1) {
            let block = new BlockClass.Block({data: 'Genesis Block'});
            await this._addBlock(block);
        }
    }

    getChainHeight() {
        return Promise.resolve(this.height);
    }

    _addBlock(block) {
        let self = this;
        return new Promise(async (resolve, reject) => {
            try {
                const height = self.chain.length;
                block.height = height;
                block.previousBlockHash = height > 0 ? self.chain[height - 1].hash : null;
                block.time = new Date().getTime().toString().slice(0, -3);
                block.hash = SHA256(JSON.stringify(block)).toString()
                self.chain.push(block);
                self.height++;
                resolve(block);
            } catch (error) {
                reject(`An error occurred on adding block to blockchain: ${error}`);
            }
        });

    }

    requestMessageOwnershipVerification(address) {
        return new Promise((resolve) => {
            const unsignedMessage = `${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`;
            resolve(unsignedMessage);
        });
    }

    submitStar(address, message, signature, star) {
        let self = this;
        const maxTimeout = 300;
        return new Promise(async (resolve, reject) => {
            let msgTime = parseInt(message.split(':')[1]);
            let currentTime = new Date().getTime().toString().slice(0, -3);
            let elapsed = currentTime - msgTime;
            if (elapsed < maxTimeout) {
                reject(new Error(`Message signature obsolete - max admissible time before signing is: ${maxTimeout} seconds.`));
                return;
            }
            let isSigned = bitcoinMessage.verify(message, address, signature);
            if (!isSigned) {
                reject(new Error(`Message not signed`));
                return;
            }

            let data = {star: star, owner: address};
            let block = new BlockClass.Block(data);
            await self._addBlock(block);
            resolve(block)
        });
    }

    getBlockByHash(hash) {
        let self = this;
        return new Promise((resolve) => {
            let block = self.chain.find(e => e.hash === hash);
            block ? resolve(block) : resolve(null);
        });
    }

    getBlockByHeight(height) {
        let self = this;
        return new Promise((resolve) => {
            let block = self.chain.filter(p => p.height === height)[0];
            block ? resolve(block) : resolve(null);
        });
    }

    getStarsByWalletAddress(address) {
        let self = this;
        return new Promise(async (resolve) => {
            let stars = self.chain.filter(block => !block.isGenesisBlock()).map(block => block.getBData());
            let starsForOwner = await Promise.all(stars).then(result => result.filter(data => data.owner === address));
            resolve(starsForOwner);
        });
    }

    validateChain() {
        let self = this;
        let errorLog = [];
        return new Promise(async (resolve) => {
            let blocks = self.chain;
            blocks.forEach((block, index) => {
                if (!block.validate()) {
                    errorLog.push(`Invalid block hash ${block.hash}`);
                }
                if (block.height > 0) {
                    const previousBlockHash = blocks[index - 1].hash;
                    const isValid = block.previousBlockHash !== previousBlockHash;
                    if (isValid) {
                        errorLog.push(`Previous block has invalid hash: ${block.previousBlockHash}, expected: ${previousBlockHash}`);
                    }
                }
            });
            resolve(errorLog);
        });
    }
}

module.exports.Blockchain = Blockchain;