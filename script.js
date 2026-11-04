
const search = document.getElementById("search");

// Permite digitar normalmente, mas impede pesquisas.
search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
    }
});

// Impede que o formulário ou a página tente pesquisar.
document.addEventListener("submit", (event) => {
    event.preventDefault();
});
