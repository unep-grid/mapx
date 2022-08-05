library(ggplot2)



tagsStr <- system(
  'git tag --format "%(refname:short) %(creatordate:short)"',
  intern = T
)
tags <- read.csv(text = tagsStr, sep = " ", header = F)
names(tags) <- c("tag", "date")
branch <- system("git branch --show-current", intern = T)

tags$date <- as.Date(tags$date)
tags <- tags[order(tags$date), ]
tryCatch(
  {
    for (i in seq_len(nrow(tags))) {
      row <- tags[i, ]
      system(sprintf("git checkout %s", row$tag))
      tags[i, "n_server"] <- as.integer(
        system(
          "git ls-files  */server/*.R | xargs cat | wc -l",
          intern = T
        )
      )
      tags[i, "n_helper"] <- as.integer(
        system(
          "git ls-files  */helper*/*.R | xargs cat | wc -l",
          intern = T
        )
      )
    }
  },
  finally = {
    system(sprintf("git checkout %s", branch))
  }
)

ggplot(tags, aes(date)) +
  geom_line(aes(y = n_server), colour = "red") +
  geom_line(aes(y = n_helper)) 
