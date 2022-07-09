import * as crypto from 'crypto'

/**
 * A fundamental purpose of cryptocurrency. It is the most basic building block of all financial systems.
 */
class Transaction {
  constructor(
    public amount: number,
    public payer: string, // public key of the sender
    public payee: string, // public key of the receiver
  ) {}

  toString() {
    return JSON.stringify(this)
  }
}

/**
 * A container for multiple transactions.
 */
class Block {
  /**
   * A nonce is a random or semi-random number that is generated for a specific use. It is related to cryptographic
   * communication and information technology (IT). The term stands for "number used once" or "number once" and is
   * commonly referred to as a cryptographic nonce.
   */
  public nonce = Math.round(Math.random() * 999_999_999)

  constructor(
    /**
     * Hash - is constructed using a hash function, which takes an input, does some processing and returns a hash
     * or hash digest. The hash itself cannot be used to get initial input, but it can be used to verify that the
     * input was correct.
     */
    public previousHash: string,

    /**
     * In our case it's going to be just one transaction to keep things simple.
     */
    public transaction: Transaction,

    /**
     * Timestamp, because all blocks will be placed in a chronological order.
     */
    public timestamp = Date.now(),
  ) {}

  /**
   * Hash is produced using SHA-256 - Secure Hash Algorithm, which produces 256-bit (32-byte) hash value.
   */
  get hash() {
    const string = JSON.stringify(this)
    const hash = crypto.createHash('sha256')
    hash.update(string).end()
    return hash.digest('hex')
  }
}

/**
 * Linked list of blocks.
 */
class Chain {
  /**
   * Singleton instance
   */
  public static instance = new Chain()

  chain: Block[]

  constructor() {
    this.chain = [
      /**
       * First block in a chain, which is also called a genesis block. The previous hash is `null`
       * because there is nothing for it to link to.
       */
      new Block(null!, new Transaction(100, 'genesis', 'satoshi')),
    ]
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1]
  }

  /**
   * Double spend issue - what if someone tries to send money to two different people at the same time?
   * They could potentially spend more that they actually own, before the transaction will be registered on the blockchain.
   *
   * Bitcoin address this problem with a "proof of work" system. It requires each block to go through a process called "mining".
   *
   * Mining - a difficult computational problem is solved in order to confirm a block. This problem is very easy to verify by
   * other nodes on the system. So, multiple nodes (miners) are competing against each other, to confirm the block on the blockchain.
   * The winner, wins a portion of the bitcoin. It's like converting cloud computing resources into money.
   */
  mine(nonce: number) {
    let solution = 1
    console.log('⛏️  mining...')

    while (true) {
      /**
       * MD5 - Message-Digest Algorithm (128-bit) - faster to compute than SHA-256
       */
      const hash = crypto.createHash('md5')
      hash.update((nonce + solution).toString()).end()

      const attempt = hash.digest('hex')

      if (attempt.substring(0, 4) === '0000') {
        console.log(`Solved: ${solution}`)
        return solution
      }

      solution += 1
    }
  }

  addBlock(
    transaction: Transaction,
    senderPublickKey: string,
    signature: Buffer,
  ) {
    const verifier = crypto.createVerify('sha256')
    verifier.update(transaction.toString())

    const isValid = verifier.verify(senderPublickKey, signature)
    if (!isValid) {
      throw new Error('Invalid signature')
    }

    const newBlock = new Block(this.lastBlock.hash, transaction)
    this.mine(newBlock.nonce)
    this.chain.push(newBlock)
  }
}

class Wallet {
  /**
   * Receiving money
   */
  public publicKey: string

  /**
   * Spending money
   */
  public privateKey: string

  constructor() {
    // RSA - Rivest-Shamir-Adleman - is a public-key cryptosystem that uses a pair of keys to encrypt and decrypt messages.
    // Full encryption algorith, that can encrypt data and decrypt it
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    this.publicKey = keypair.publicKey
    this.privateKey = keypair.privateKey
  }

  sendMoney(amount: number, payeePublicKey: string) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey)
    const sign = crypto.createSign('sha256')
    sign.update(transaction.toString()).end()

    const signature = sign.sign(this.privateKey)

    Chain.instance.addBlock(transaction, this.publicKey, signature)
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Example
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const satoshi = new Wallet()
const bob = new Wallet()
const alice = new Wallet()

satoshi.sendMoney(20, bob.publicKey)
satoshi.sendMoney(30, alice.publicKey)

console.log(Chain.instance)
