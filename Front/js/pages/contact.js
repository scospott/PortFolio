                    document.getElementById("contact-form").addEventListener("submit", async (e) => {
                        e.preventDefault();
                        const form = e.target;
                        const notification = document.getElementById("notification");

                        try {
                            const response = await fetch("https://formspree.io/f/xanpvdon", {
                                method: "POST",
                                body: new FormData(form),
                                headers: { "Accept": "application/json" }
                            });

                            if (response.ok) {
                                notification.textContent = " Message envoyé avec succès !";
                                notification.classList.remove("hidden");
                                form.reset();
                                setTimeout(() => notification.classList.add("hidden"), 3000);
                            } else {
                                notification.textContent = " Une erreur est survenue. Réessaie plus tard.";
                                notification.classList.remove("hidden");
                                setTimeout(() => notification.classList.add("hidden"), 3000);
                            }
                        } catch (error) {
                            notification.textContent = " Impossible d’envoyer le message.";
                            notification.classList.remove("hidden");
                            setTimeout(() => notification.classList.add("hidden"), 3000);
                        }
                    });