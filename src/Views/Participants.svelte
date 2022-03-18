<script>
    import Bob from "./Bob.svelte";
    import Alice from "./Alice.svelte";
    
    let selectedPlayer="";
    const participants = ["Alice","Bob"]
</script>
<form>
    <label for="player">Select Player</label>
    <select id="player" bind:value={selectedPlayer}>
        {#each participants as party}
            <option>{party}</option>
        {/each}
    </select>
</form>
{#if selectedPlayer == "Alice"}
    <Alice></Alice>
{:else if selectedPlayer == "Bob"}
    <Bob></Bob>
{/if}

