import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const updateTheme = () => {
    const isDark = document.documentElement.classList.contains("dark")
    localStorage.setItem("theme", isDark ? "dark" : "light")
    document.documentElement.setAttribute(
      "data-theme",
      isDark ? "material-theme-darker" : "material-theme-lighter",
    )
  }

  const handleToggleClick = () => {
    document.documentElement.classList.toggle("dark");
    updateTheme()
  }

  return (
    <button
      onClick={handleToggleClick}
      data-umami-event="theme-toggle"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <Sun className="transform transition duration-500 hover:-rotate-45 dark:hidden" />
      <Moon className="hidden transform transition duration-500 hover:-rotate-45 dark:block" />
    </button>
  )
}
