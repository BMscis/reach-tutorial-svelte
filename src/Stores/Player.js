import { get } from "svelte/store";
import * as backend from '../reach/index.main.mjs';
import { playerHand, reachStore, accountStore, showHands, showAliceOutcome, showBobOutcome, aliceWaitingForResponse, bobWaitingForResponse } from "./accountStore";

const handToInt = { 'ROCK': 0, 'PAPER': 1, 'SCISSORS': 2 };
//const intToOutcome = ['Bob wins!', 'Draw!', 'Alice wins!'];
export class Player {
    constructor() {
        this.reach = get(reachStore).reach
        this.accountStore = get(accountStore)
        console.log("_____________PLAYER______________")
    }
    lastTimeStamp = 0
    show = (val) => {
        switch (val) {
            case true:
                this.constructor.name == "Deployer" ?
                    showHands.set({ deploy: true, attach: false }) :
                    showHands.set({ deploy: false, attach: true })
                break;

            case false:
                showHands.set({ deploy: false, attach: false })
                this.constructor.name == "Deployer" ?
                    aliceWaitingForResponse.set(true) :
                    bobWaitingForResponse.set(true)
                break;
        }
    }
    getHand = async () => {
        this.show(true)

        console.log("getHand ", this.constructor.name)
        let res = await this.play()

        this.show(false)
        console.log("getHand: ", this.constructor.name)
        return res
    }
    play = () => new Promise(resolve => {
        playerHand.subscribe((value) => {
            console.log("PLAYER playerHand: ", value)
            if (value.handPlayed.length > 0 && value.timestamp != this.lastTimeStamp) {
                resolve(handToInt[value.handPlayed])
            }
        })
    })
    random() {
        console.log("THIS IS SO RANDOM")
        return this.reach.hasRandom.random()
    }
    seeOutcome(i) {
        console.log("OutComeIS: ", intToOutcome[i])
    }
    informTimeout(deadline) {
        console.log("InformTimeOutIs: ", deadline)
    }
    getAccountBalance = () => {
        ethereum
            .request({
                method: 'eth_getBalance',
                params: [this.accountStore.account],
            })
            .then((getBalanceResult) => {
                accountStore.set({
                    account: this.accountStore.account,
                    balance: reach.formatCurrency(getBalanceResult, 4),
                    container: this.accountStore.container
                })
            })
    }
}
export class Deployer extends Player {
    constructor(wager) {
        super()
        this.wager = this.reach.parseCurrency(wager)
        this.deadline = { ETH: 10, ALGO: 100, CFX: 1000 }[this.reach.connector]
        this.intToOutcome = ['You lose!', 'It\'s Draw!', 'You win!'];
        console.log("_____________DEPLOYER______________")
    }
    async deployContract() {
        let ctc = await this.accountStore.container.contract(backend)
        backend.Alice(ctc, this)
        const ctcInfoStr = JSON.stringify(await ctc.getInfo(), null, 2);
        console.log("::::::::deploy contract:::::::::::::")
        return ctcInfoStr
    }
    seeOutcome(i) {
        aliceWaitingForResponse.set(false)
        showAliceOutcome.set({ outCome: this.intToOutcome[i] })
        this.getAccountBalance()
    }
}
export class Attacher extends Player {
    constructor() {
        super()
        this.intToOutcome = ['You Win!', 'It\'s Draw!', 'You Lose!'];
        console.log("_____________ATTACHER______________")
    }
    async attach(ctcInfoStr) {
        console.log("::::::::attach contract:::::::::::::")
        let ctc = await this.accountStore.container.contract(backend, JSON.parse(ctcInfoStr))
        let ctx = await backend.Bob(ctc, this)
        console.log("ATTACHER - DONE: ")
    }
    async acceptWager(wagerAtomic) {
        console.log("::::::::wage:::::::::::::")
        const wager = this.reach.formatCurrency(wagerAtomic, 4)
    }
    seeOutcome(i) {
        bobWaitingForResponse.set(false)
        showBobOutcome.set({ outCome: this.intToOutcome[i] })
        this.getAccountBalance()
    }
}
