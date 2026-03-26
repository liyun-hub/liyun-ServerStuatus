FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/agent ./cmd/agent

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /out/agent /app/agent
ENV SERVER_WS_URL=ws://server:8080/ws/agent
ENV NODE_ID=agent-1
ENV HEARTBEAT_INTERVAL_SEC=5
ENV COLLECT_INTERVAL_SEC=5
ENV RECONNECT_WAIT_SEC=3
CMD ["/app/agent"]
