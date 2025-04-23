#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display help
show_help() {
  echo -e "${YELLOW}Discord Bot Docker Setup Script${NC}"
  echo ""
  echo "Usage: ./docker-setup.sh [COMMAND]"
  echo ""
  echo "Commands:"
  echo "  start       Build and start the bot(s)"
  echo "  stop        Stop the bot(s)"
  echo "  restart     Restart the bot(s)"
  echo "  logs        View logs from the bot(s)"
  echo "  status      Check the status of the bot(s)"
  echo "  help        Show this help message"
  echo ""
}

# Function to start the bot
start_bot() {
  echo -e "${YELLOW}Starting Discord bot(s)...${NC}"
  docker-compose up -d --build
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Bot(s) started successfully!${NC}"
  else
    echo -e "${RED}Failed to start bot(s). Check the error message above.${NC}"
  fi
}

# Function to stop the bot
stop_bot() {
  echo -e "${YELLOW}Stopping Discord bot(s)...${NC}"
  docker-compose down
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Bot(s) stopped successfully!${NC}"
  else
    echo -e "${RED}Failed to stop bot(s). Check the error message above.${NC}"
  fi
}

# Function to restart the bot
restart_bot() {
  echo -e "${YELLOW}Restarting Discord bot(s)...${NC}"
  docker-compose restart
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Bot(s) restarted successfully!${NC}"
  else
    echo -e "${RED}Failed to restart bot(s). Check the error message above.${NC}"
  fi
}

# Function to view logs
view_logs() {
  echo -e "${YELLOW}Showing logs for Discord bot(s)...${NC}"
  docker-compose logs -f
}

# Function to check status
check_status() {
  echo -e "${YELLOW}Checking status of Discord bot(s)...${NC}"
  docker-compose ps
}

# Main script logic
case "$1" in
  start)
    start_bot
    ;;
  stop)
    stop_bot
    ;;
  restart)
    restart_bot
    ;;
  logs)
    view_logs
    ;;
  status)
    check_status
    ;;
  help|*)
    show_help
    ;;
esac
