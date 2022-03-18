<script>
import { onMount } from "svelte";
import Hand from "./Hand.svelte";
import {Deployer} from "../Stores/Player"
import { aliceWaitingForResponse, showAliceOutcome, showHands } from "../Stores/accountStore";

    let wager
    let contract
    let alicePlayer
    let outCome=""
    let showHand
    let aliceWaiting = false

    async function deployContract() {
        alicePlayer = new Deployer(wager);
        contract = await alicePlayer.deployContract();
        console.log("+++++++++++++++++++ALICE VIEW")
    }
    const resetContract = () => {
        contract = undefined
        outCome = ""
        return
    }
    onMount(() => {
        return [
            showAliceOutcome.subscribe((value) => {
                outCome = value.outCome
            }),
            showHands.subscribe((value) => {
                showHand = value.deploy
            }),
            aliceWaitingForResponse.subscribe((value) => {
                aliceWaiting = value
            })
        ]
    })
</script>
{#if !contract}
<form on:submit|preventDefault={() => {deployContract()}}>
    <label for="wager">Set Wager
    <input type="number" id="wager" bind:value={wager}/>
    </label>
    <button type="submit">WAGE</button>
</form>
{/if}
{#if contract}
<blockquote>Copy this.</blockquote>
<code>{contract}</code>
{/if}
{#if showHand}
<Hand ></Hand>
{/if}
{#if aliceWaiting}
    <p>Waiting for response</p>
{/if}
{#if outCome.length > 0}
    <p>{outCome}</p>
    <button on:click={() => {resetContract()}} >play again</button>
{/if}

