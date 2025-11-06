<script>
  import Button from "@/components/Button.svelte";
  import * as anime from 'animejs';

</script>
<h1 class="text-3xl font-bold underline text-center mt-10">
  Hello world!
</h1>
<Button label="Click Me" className="mt-5 mx-auto block" />
<style lang="postcss">
  @reference "tailwindcss";

  :global(html) {
    background-color: theme(--color-gray-100);
  }
</style>