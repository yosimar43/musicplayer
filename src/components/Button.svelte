<script>
    export let label = 'hello';
    export let disabled = false;
    export let className = '';
</script>

<button
    class={`px-4 py-2 bg-blue-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'} ${className}`}
    {disabled}
>
    <slot>{label}</slot>
</button>
