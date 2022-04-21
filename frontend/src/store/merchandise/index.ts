import {
  IState,
} from '@/interfaces';
import {approveFeeFromAnyContractSimple} from '@/contract-call-utils';
import {abi as priceOracleAbi} from '@/../../build/contracts/IPriceOracle.json';


const defaultCallOptions = (rootState:  IState) => ({ from: rootState.defaultAccount });

const merchandise = {
  getters:{
    getCartEntries(state) {
      return state.cartEntries;
    }
  },
  mutations:{
    addCartEntry(state: IState, cartEntry: CartEntry) {
      const duplicatedEntry = state.cartEntries.find(entry => entry.variant.id === cartEntry.variant.id);
      if (duplicatedEntry) {
        const entryIndex = state.cartEntries.indexOf(duplicatedEntry);
        state.cartEntries.splice(entryIndex, 1);
      }
      state.cartEntries.push(cartEntry);
    },

    removeCartEntry(state: IState, cartEntry: CartEntry) {
      state.cartEntries.splice(state.cartEntries.indexOf(cartEntry), 1);
    },

    clearCartEntries(state: IState) {
      state.cartEntries = [];
    },
  },
  actions: {
    async currentSkillPrice({ state }) {
      const { Merchandise } = state.contracts();
      if(!Merchandise || !state.defaultAccount) return;

      const skillOracle = await Merchandise.methods.skillOracle().call(defaultCallOptions(state));
      return await new web3.eth.Contract(priceOracleAbi as any[], skillOracle).methods
        .currentPrice().call(defaultCallOptions(state));
    },

    async createOrder({ state, dispatch }, {orderNumber, payingAmount}) {
      const { CryptoBlades, SkillToken, Merchandise } = state.contracts();
      if(!CryptoBlades || !SkillToken || !Merchandise || !state.defaultAccount) return;

      const skillNeeded = await CryptoBlades.methods
        .getSkillNeededFromUserWallet(state.defaultAccount, payingAmount, true)
        .call(defaultCallOptions(state));

      await approveFeeFromAnyContractSimple(
        CryptoBlades,
        SkillToken,
        state.defaultAccount,
        defaultCallOptions(state),
        defaultCallOptions(state),
        new BigNumber(skillNeeded)
      );

      await Merchandise.methods
        .createOrder(orderNumber, payingAmount)
        .send({
          from: state.defaultAccount
        });

      dispatch('fetchSkillBalance');
    },
  },
};


export default merchandise;