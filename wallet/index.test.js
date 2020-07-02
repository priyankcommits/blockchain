const Wallet = require('./index');
const TransactionPool = require('./transaction-pool');
const BlockChain = require('../blockchain');
const { INITIAL_BALANCE } = require('../config');

describe('Wallet', () => {
  let wallet, tp, bc;

  beforeEach(() => {
    wallet = new Wallet();
    tp = new TransactionPool();
    bc = new BlockChain();
  });

  describe('creating a transaction', () => {
    let transaction, sendAmount, recepient;

    beforeEach(() => {
      sendAmount = 30;
      recepient = 'r4nd0m-4ddr355';
      transaction = wallet.createTransaction(recepient, sendAmount, bc, tp);
    });

    describe('and doing the same transaction', () => {
      beforeEach(() => {
        wallet.createTransaction(recepient, sendAmount, bc, tp);
      });

      it('double the `sendAmount` subtracted from the wallet balance', () => {
        expect(transaction.outputs.find(output => output.address === wallet.publicKey).amount).toEqual(wallet.balance - sendAmount * 2);
      });

      it('clones the `sendAmount` output for the recepient', () => {
        expect(transaction.outputs.filter(output => output.address === recepient).map(output => output.amount)).toEqual([sendAmount, sendAmount]);
      });
    });
  });

  describe('calculating a balance', () => {
    let addBalance, repeatAdd, senderWallet;

    beforeEach(() => {
      senderWallet = new Wallet();
      addBalance = 100;
      repeatAdd = 3;
      for (let i=0; i<repeatAdd; i++) {
        senderWallet.createTransaction(wallet.publicKey, addBalance, bc, tp);
      }
      bc.addBlock(tp.transactions);
    });

    it('calculates the balance for blockchain transactions matching the recepient', () => {
      expect(wallet.calculateBalance(bc)).toEqual(INITIAL_BALANCE + (addBalance * repeatAdd));
    });

    it('calculates the balance for blockchain transactions matching the sender', () => {
      expect(senderWallet.calculateBalance(bc)).toEqual(INITIAL_BALANCE - (addBalance * repeatAdd));
    });

    describe('and the recepients conducts a transaction', () => {
      let subtractBalance, recepientBalance;

      beforeEach(() => {
        tp.clear();
        subtractBalance = 60;
        recepientBalance = wallet.calculateBalance(bc);
        wallet.createTransaction(senderWallet.publicKey, subtractBalance, bc, tp);
        bc.addBlock(tp.transactions);
      });

      describe('and the sender sends another transaction to the recepient', () => {
        beforeEach(() => {
          tp.clear();
          senderWallet.createTransaction(wallet.publicKey, addBalance, bc, tp);
        });

        it('calculates the recepient balance only using transactions since its most recent one', () => {
          expect(wallet.calculateBalance(bc)).toEqual(recepientBalance - subtractBalance + addBalance);
        });
      });
    });
  });
});
