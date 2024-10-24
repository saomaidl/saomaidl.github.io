$(document).ready(function() {
    $('#search').on('input', function() {
        $('.clear-button').remove();
        if ($(this).val().trim() !== '') {
            const clearButton = `
                <button class="box-border tap-highlight-transparent bg-transparent border-0 rounded-full cursor-pointer absolute text-center no-underline text-normal touch-manipulation transition-duration-33 transition-all user-select-none vertical-align-middle color-subdued min-inline-size-0 inline-flex items-center justify-center right-3 color-black top-1-2 -translate-y-1-2 overflow-wrap-anywhere clear-button" style="-webkit-transform: translateY(-50%);transform: translateY(-50%);" data-testid="search-input-clear-button" aria-label="Clear search field" data-encore-id="buttonTertiary">
                    <span aria-hidden="true" class="flex">
                        <svg data-encore-id="icon" role="img" aria-hidden="true" viewBox="0 0 16 16" class="w-5 h-5 fill-current">
                            <path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06Z"></path>
                        </svg>
                    </span>
                </button>
            `;
            $(this).after(clearButton);
        }
    });

    $(document).on('click', '.clear-button', function() {
        $('#search').val('');
        $(this).remove();
    });
});
