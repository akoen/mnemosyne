const journal_root = document.getElementById("journal-root")

const fetchJournal = async () => {
  const data = await fetch("http://localhost:4800/raw_data?metric=eq.journal&order=time.desc")
    .then(response => response.json())
    .catch(error => console.error(error));

  return data
}

const renderJournal = async () => {
  const data = await fetchJournal()

  const entries = data.map((e) => {
    const date = new Date(e.time).toISOString().slice(0, 10);
    const text = e.value

    return (
      `<div class="jnl">
        <p class="jnl--text">${text}</p>
        <p class="jnl--date">${date}</p>
      </div>
      `
    )
  })

  journal_root.innerHTML = entries.join("\n")

}

renderJournal()
