if ! echo "QUIT" | telnet $POSTGRES_HOST $POSTGRES_PORT 2>/dev/null | grep "Escape character is"; then
  echo "PostgreSQL is unavailable"
  exit 1
fi
