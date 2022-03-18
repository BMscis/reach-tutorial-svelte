<script>
import { onMount } from "svelte";

    import {handStore, showHands} from "../Stores/accountStore";

    let handPlayed=""
    const hands = ["ROCK", "PAPER", "SCISSORS"]
    const [handStoreSubscribe, handStoreValidate] = handStore()

    onMount(() => {
    })
</script>
<form on:submit|preventDefault={handStoreValidate(handPlayed)}>
    {#each hands as hand}
        <label for={hand}>{hand}
        <input type="radio" name="hand" id={hand} bind:group={handPlayed} value={hand}/>
        </label>
    {/each}
    <br/>
    <button type="submit" >PLAY</button>
</form>
<p>HandStore: {$handStoreSubscribe.handPlayed}</p>