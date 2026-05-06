FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html

RUN rm -rf /usr/share/nginx/html/* \
  && rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html ./
COPY account ./account
COPY admin ./admin
COPY auth ./auth
COPY cart ./cart
COPY catalog ./catalog
COPY hit ./hit
COPY home ./home
COPY new ./new
COPY product ./product
COPY product-alt ./product-alt
COPY ["фото", "./фото"]
COPY shared ./shared
COPY uploads ./uploads
COPY ["главная страница", "./главная страница"]
COPY ["каталог", "./каталог"]
COPY ["страница товара", "./страница товара"]
COPY ["товар", "./товар"]

RUN find /usr/share/nginx/html -type d -exec chmod 755 {} \; \
  && find /usr/share/nginx/html -type f -exec chmod 644 {} \;

EXPOSE 80
