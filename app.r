setwd("/Users/nourmaatouk/Desktop/prefinaladv/AI-CLASSTEST2")

# Don't start Python - it's already running separately

library(shiny)
library(ggplot2)
library(dplyr)

CSV_FILE <- "emotion_log.csv"

ui <- fluidPage(
  titlePanel("Professor Dashboard: Attendance & Emotions"),
  
  fluidRow(
    column(4,
      h4("Statistics"),
      tableOutput("stats_table"),
      actionButton("refresh", "Refresh", class = "btn-primary"),
      actionButton("download_report", "Download Report", class = "btn-success")
    ),
    column(8,
      h4("Emotion Distribution"),
      plotOutput("emotion_plot")
    )
  ),
  
  hr(),
  
  fluidRow(
    column(12,
      h4("Attendance List"),
      tableOutput("attendance_table")
    )
  ),
  
  fluidRow(
    column(12,
      h4("Confidence Trend"),
      plotOutput("trend_plot")
    )
  ),
  
  tags$script(HTML("setInterval(function() { Shiny.onInputChange('refresh_trigger', Date.now()); }, 3000);"))
)

server <- function(input, output) {
  
  load_data <- reactive({
    input$refresh
    input$refresh_trigger
    
    if (file.exists(CSV_FILE)) {
      tryCatch({
        df <- read.csv(CSV_FILE, stringsAsFactors = FALSE)
        if (nrow(df) > 0) {
          df$Emotion <- tolower(trimws(df$Emotion))
          df$Confidence <- suppressWarnings(as.numeric(df$Confidence))
          df$Confidence <- ifelse(is.na(df$Confidence), 0, df$Confidence)
          return(df)
        }
      }, error = function(e) { return(data.frame()) })
    }
    return(data.frame())
  })
  
  output$stats_table <- renderTable({
    df <- load_data()
    if (nrow(df) == 0) {
      return(data.frame(Metric = "Loading...", Value = "-"))
    }
    data.frame(
      Metric = c("Total Samples", "Students", "Avg Confidence"),
      Value = c(nrow(df), length(unique(df$Student_ID)), 
                paste0(round(mean(df$Confidence, na.rm=T)*100), "%"))
    )
  })
  
  output$emotion_plot <- renderPlot({
    df <- load_data()
    if (nrow(df) == 0) { plot(1, main="Waiting for data..."); return() }
    
    emotion_counts <- df %>% group_by(Emotion) %>% 
      summarize(Count = n(), .groups = "drop") %>% arrange(desc(Count))
    
    ggplot(emotion_counts, aes(x = reorder(Emotion, Count), y = Count, fill = Emotion)) +
      geom_bar(stat = "identity") + coord_flip() + theme_minimal() +
      labs(x = "", y = "Count") + theme(legend.position = "none")
  })
  
  output$attendance_table <- renderTable({
    df <- load_data()
    if (nrow(df) == 0) { return(data.frame(Student = "-", Count = "-")) }
    
    df %>% group_by(Student_ID) %>%
      summarize(Detections = n(), Avg_Confidence = round(mean(Confidence, na.rm=T), 2), .groups="drop") %>%
      head(20)
  })
  
  output$trend_plot <- renderPlot({
    df <- load_data()
    if (nrow(df) < 2) { plot(1, main="Need more data..."); return() }
    
    df <- tail(df, 100)
    df$Index <- 1:nrow(df)
    
    ggplot(df, aes(x = Index, y = Confidence, color = Emotion)) +
      geom_line(alpha = 0.6) + geom_point(size = 2) + theme_minimal() +
      labs(x = "Time", y = "Confidence Score", title = "Emotion Confidence Over Time")
  })
  
  observeEvent(input$download_report, {
    df <- load_data()
    if (nrow(df) == 0) {
      showNotification("No data to download", type = "error")
      return()
    }
    filename <- paste0("emotion_report_", format(Sys.time(), "%Y%m%d_%H%M%S"), ".csv")
    write.csv(df, filename, row.names = FALSE)
    showNotification(paste("Saved to", filename), type = "message")
  })
}

runApp(list(ui = ui, server = server), host = "0.0.0.0", port = 1235, launch.browser = FALSE)
