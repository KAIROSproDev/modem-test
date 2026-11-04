
"use strict";

const searchInput = document.getElementById("searchInput");

// Permite digitar normalmente.
// Pressionar Enter não realiza nenhuma pesquisa.
searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
    }
});

// Mantém o texto digitado no campo.
searchInput.addEventListener("input", () => {
    // Nenhuma pesquisa será executada.
});

// Os elementos visuais não navegam para outros sites.
document.querySelectorAll(
    ".shortcut, .icon-button, .customize-button"
).forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();
    });
});
