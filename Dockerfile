# Usa una imagen oficial de Node.js (versión LTS, por ejemplo 18)
FROM node:18-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos package.json y package-lock.json
COPY package*.json ./

# Instalar las dependencias
RUN npm install

# Copiar todo el contenido del proyecto al contenedor
COPY . .

# Exponer el puerto 3000 (dentro del contenedor)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "app.js"]
