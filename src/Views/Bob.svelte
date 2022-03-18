<script>
    import { onMount } from "svelte";
    import Hand from "./Hand.svelte";
    import { Attacher } from "../Stores/Player";
    import { bobWaitingForResponse, showBobOutcome, showHands } from "../Stores/accountStore";
    let attachedContract
    let bobPlayer
    let outCome=""
    let showHand
    let bobWaiting=false
    async function attachToContract(){
        bobPlayer = new Attacher()
        await bobPlayer.attach(attachedContract)
        console.log("+++++++++++++++++++BOB VIEW")
    }

    const resetContract = () => {
        contract = undefined
        outCome = ""
        return
    }

    onMount(() => {
        return [
            showBobOutcome.subscribe((value) => {
                outCome = value.outCome
            }),
            showHands.subscribe((value) => {
                showHand = value.attach
            }),
            bobWaitingForResponse.subscribe((value) => {
                bobWaiting = value
            })
        ]    
    })
</script>
<form on:submit|preventDefault={attachToContract}>
    <label for="attach">
        <textarea type="text" name="attach" id="attach" bind:value={attachedContract}/>
    </label>
    <button type="submit">ATTACH CONTRACT</button>
</form>
{#if showHand}
<Hand ></Hand>
{/if}
{#if bobWaiting}
    <p>Waiting for response</p>
{/if}
{#if outCome.length > 0}
    <p>{outCome}</p>
    <button on:click={() => {resetContract()}} >play again</button>
{/if}
