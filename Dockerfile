FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

RUN rm -rf /usr/share/nginx/html/* \
  && rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html ./
COPY account ./account
COPY admin ./admin
COPY auth ./auth
COPY buyers ./buyers
COPY cart ./cart
COPY catalog ./catalog
COPY favorites ./favorites
COPY hit ./hit
COPY home ./home
COPY new ./new
COPY product ./product
COPY product-alt ./product-alt
COPY privacy.pdf ./privacy.pdf
COPY shared ./shared
COPY uploads ./uploads

RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; \
  && find /usr/share/nginx/html -type f -exec chmod 644 {} \;

EXPOSE 80
