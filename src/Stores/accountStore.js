import { writable } from "svelte/store";
export const reachStore = writable({reach:{}})

export const playerHand = writable({handPlayed:"",timestamp:0})

export const showHands = writable({deploy:false,attach:false})

export const showAliceOutcome = writable({outCome:""})

export const aliceWaitingForResponse = writable(false)

export const showBobOutcome = writable({outCome:""})

export const bobWaitingForResponse = writable(false)

export const accountStore = writable({account:"",balance:0,container:{}})

export const handStore = (() => {
    const {subscribe, set} = playerHand
    function action(value){
        function validate(value){
            set({handPlayed:value, timestamp:new Date().getTime()})
            return
            //a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
        }
        validate(value)
        return {
            update(value){
                validate(value)
            }
        }
    }
    return [{subscribe}, action]
})