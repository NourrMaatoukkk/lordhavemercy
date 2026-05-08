setwd("/Users/nourmaatouk/Desktop/prefinaladv/AI-CLASSTEST2")

# Start Python camera service in background
if (.Platform$OS.type == "windows") {
  system("cmd /c start python camera_service.py", wait = FALSE)
  Sys.sleep(2)
  system("cmd /c start python dashboard.py", wait = FALSE)
} else {
  system("python3 camera_service.py &", wait = FALSE)
  Sys.sleep(2)
  system("python3 dashboard.py &", wait = FALSE)
}

library(shiny)
library(ggplot2)
library(dplyr)
library(gridExtra)

CSV_FILE <- "emotion_log.csv"

ui <- fluidPage(
  titlePanel("Live Classroom Emotion Detection Dashboard"),
  
  fluidRow(
    column(8,
      h3("Live Camera Feed with Emotion Detection"),
      tags$img(src = "http://localhost:5000/frame", style = "width: 100%; border: 2px solid #333; border-radius: 5px;"),
      p("Camera feed updates in real-time from Python backend", style = "color: #666; font-size: 12px;")
    ),
    column(4,
      h3("Real-Time Statistics"),
      tableOutput("emotion_stats"),
      hr(),
      actionButton("refresh_data", "Refresh Data", class = "btn-primary"),
      actionButton("save_report", "Save Report", class = "btn-success")
    )
  ),
  
  hr(),
  
  fluidRow(
    column(6,
      h3("Emotion Distribution"),
      plotOutput("emotion_histogram", height = "300px")
    ),
    column(6,
      h3("Confidence Levels"),
      plotOutput("confidence_histogram", height = "300px")
    )
  ),
  
  hr(),
  
  fluidRow(
    column(12,
      h3("Emotion Timeline"),
      plotOutput("emotion_timeline")
    )
  ),
  
  fluidRow(
    column(12,
      h3("Recent Detections"),
      tableOutput("recent_detections")
    )
  ),
  
  # Auto-refresh every 2 seconds
  tags$script(HTML("
    setInterval(function() {
      Shiny.onInputChange('refresh_trigger', Date.now());
    }, 2000);
  "))
)

server <- function(input, output, session) {
  
  # Load emotion log data
  load_data <- reactive({
    input$refresh_trigger
    input$refresh_data
    
    if (file.exists(CSV_FILE)) {
      tryCatch({
        df <- read.csv(CSV_FILE, stringsAsFactors = FALSE)
        if (nrow(df) > 0) {
          df$Emotion <- tolower(trimws(df$Emotion))
          df$Confidence <- suppressWarnings(as.numeric(df$Confidence))
          df$Confidence <- ifelse(is.na(df$Confidence), 0, df$Confidence)
          return(df)
        }
      }, error = function(e) {
        return(data.frame())
      })
    }
    return(data.frame())
  })
  
  # Real-time statistics
  output$emotion_stats <- renderTable({
    df <- load_data()
    
    if (nrow(df) == 0) {
      return(data.frame(Metric = "Waiting for data...", Value = "-"))
    }
    
    avg_confidence <- mean(df$Confidence, na.rm = TRUE)
    emotion_count <- nrow(df)
    unique_emotions <- length(unique(df$Emotion))
    
    data.frame(
      Metric = c("Total Detections", "Unique Emotions", "Avg Confidence", "Latest Emotion"),
      Value = c(
        emotion_count,
        unique_emotions,
        paste0(round(avg_confidence * 100), "%"),
        if (nrow(df) > 0) df$Emotion[nrow(df)] else "N/A"
      )
    )
  })
  
  # Emotion histogram
  output$emotion_histogram <- renderPlot({
    df <- load_data()
    
    if (nrow(df) == 0) {
      plot(1, main = "Waiting for emotion data...", xlab = "", ylab = "")
      return()
    }
    
    emotion_counts <- df %>%
      group_by(Emotion) %>%
      summarize(Count = n(), .groups = "drop") %>%
      arrange(desc(Count))
    
    ggplot(emotion_counts, aes(x = reorder(Emotion, Count), y = Count, fill = Emotion)) +
      geom_bar(stat = "identity") +
      coord_flip() +
      theme_minimal() +
      labs(x = "", y = "Count") +
      theme(legend.position = "none",
            plot.title = element_text(size = 14, face = "bold"))
  })
  
  # Confidence histogram
  output$confidence_histogram <- renderPlot({
    df <- load_data()
    
    if (nrow(df) == 0) {
      plot(1, main = "Waiting for confidence data...", xlab = "", ylab = "")
      return()
    }
    
    ggplot(df, aes(x = Confidence)) +
      geom_histogram(bins = 20, fill = "#3b82f6", color = "#1e40af") +
      theme_minimal() +
      labs(x = "Confidence Score", y = "Frequency") +
      theme(plot.title = element_text(size = 14, face = "bold"))
  })
  
  # Emotion timeline
  output$emotion_timeline <- renderPlot({
    df <- load_data()
    
    if (nrow(df) < 2) {
      plot(1, main = "Need at least 2 detections to show timeline", xlab = "", ylab = "")
      return()
    }
    
    df <- tail(df, 200)  # Last 200 detections
    df$Index <- 1:nrow(df)
    
    ggplot(df, aes(x = Index, y = Confidence, color = Emotion, group = 1)) +
      geom_line(alpha = 0.7) +
      geom_point(size = 2, alpha = 0.6) +
      theme_minimal() +
      labs(x = "Time Sequence", y = "Confidence Score", title = "Emotion Confidence Trend") +
      scale_color_manual(values = c(
        "happy" = "#FFD700",
        "sad" = "#4169E1",
        "angry" = "#FF4500",
        "neutral" = "#808080",
        "surprise" = "#32CD32",
        "fear" = "#8B008B",
        "disgust" = "#00CED1"
      )) +
      theme(legend.position = "right")
  })
  
  # Recent detections table
  output$recent_detections <- renderTable({
    df <- load_data()
    
    if (nrow(df) == 0) {
      return(data.frame(Time = "No data", Emotion = "", Confidence = ""))
    }
    
    head(df[, c("Student_ID", "Time", "Emotion", "Confidence")], 20) %>%
      mutate(Confidence = paste0(round(as.numeric(Confidence) * 100), "%"))
  })
  
  # Save report button
  observeEvent(input$save_report, {
    df <- load_data()
    
    if (nrow(df) == 0) {
      showNotification("No data to save", type = "error")
      return()
    }
    
    filename <- paste0("emotion_report_", format(Sys.time(), "%Y%m%d_%H%M%S"), ".csv")
    write.csv(df, filename, row.names = FALSE)
    showNotification(paste("Report saved to", filename), type = "message")
  })
}

runApp(
  list(ui = ui, server = server),
  host = "0.0.0.0",
  port = 1234,
  launch.browser = FALSE
)
