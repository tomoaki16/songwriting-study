FROM nginx:alpine

# Copy static dashboard content
COPY ./ /usr/share/nginx/html/

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
