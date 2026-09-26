package com.fastfit.backend.service;

import com.fastfit.backend.exception.AppException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String cloudinaryApiKey;

    @Value("${cloudinary.api-secret:}")
    private String cloudinaryApiSecret;

    private final ObjectMapper objectMapper;

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");
    private static final long MAX_SIZE = 20 * 1024 * 1024;

    public String storeProductImage(MultipartFile file) {
        return storeImage(file, "products");
    }

    public String storePromotionImage(MultipartFile file) {
        return storeImage(file, "promotions");
    }

    private String storeImage(MultipartFile file, String directory) {
        if (file == null || file.isEmpty()) throw new AppException("Arquivo vazio");
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new AppException("Formato inválido. Use JPG, PNG ou WebP");
        }
        if (file.getSize() > MAX_SIZE) throw new AppException("Arquivo muito grande. Máximo 20MB");

        if (cloudinaryEnabled()) return storeInCloudinary(file, directory);

        try {
            Path uploadPath = Paths.get(uploadDir).toAbsolutePath().getParent().resolve(directory);
            Files.createDirectories(uploadPath);

            String extension = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID() + "." + extension;
            Path target = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/" + directory + "/" + filename;
        } catch (IOException e) {
            throw new AppException("Erro ao salvar imagem: " + e.getMessage());
        }
    }

    public void deleteFile(String imageUrl) {
        if (imageUrl == null) return;
        if (isCloudinaryUrl(imageUrl)) {
            deleteFromCloudinary(imageUrl);
            return;
        }
        if (!imageUrl.startsWith("/uploads/")) return;
        try {
            Path uploadBase = Paths.get(uploadDir).toAbsolutePath().getParent();
            Path filePath = uploadBase.resolve(imageUrl.substring(1));
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private boolean cloudinaryEnabled() {
        return !cloudName.isBlank() && !cloudinaryApiKey.isBlank() && !cloudinaryApiSecret.isBlank();
    }

    private String storeInCloudinary(MultipartFile file, String directory) {
        String publicId = "fastfit/" + directory + "/" + UUID.randomUUID();
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("public_id", publicId);
        try {
            JsonNode response = postMultipart("upload", fields, file);
            String secureUrl = response.path("secure_url").asText();
            if (secureUrl.isBlank()) throw new AppException("Cloudinary não retornou a URL da imagem");
            return secureUrl;
        } catch (IOException e) {
            log.warn("Falha ao enviar imagem ao Cloudinary: {}", e.getMessage());
            throw new AppException("Cloudinary recusou o upload: " + cloudinaryErrorMessage(e.getMessage()));
        }
    }

    private void deleteFromCloudinary(String imageUrl) {
        String publicId = publicIdFromCloudinaryUrl(imageUrl);
        if (publicId == null) return;
        try {
            Map<String, String> fields = new LinkedHashMap<>();
            fields.put("public_id", publicId);
            fields.put("invalidate", "true");
            postMultipart("destroy", fields, null);
        } catch (IOException ignored) {
            // A remoção do arquivo não deve impedir a atualização/exclusão do registro.
        }
    }

    private JsonNode postMultipart(String action, Map<String, String> fields, MultipartFile file) throws IOException {
        String boundary = "FastFit-" + UUID.randomUUID();
        URL endpoint = new URL("https://api.cloudinary.com/v1_1/" + cloudName + "/image/" + action);
        HttpURLConnection connection = (HttpURLConnection) endpoint.openConnection();
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(30_000);
        connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
        String credentials = cloudinaryApiKey + ":" + cloudinaryApiSecret;
        connection.setRequestProperty("Authorization", "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8)));

        try (OutputStream output = connection.getOutputStream()) {
            for (Map.Entry<String, String> field : fields.entrySet()) {
                writeTextPart(output, boundary, field.getKey(), field.getValue());
            }
            if (file != null) writeFilePart(output, boundary, file);
            output.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        }

        int status = connection.getResponseCode();
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        String body = stream == null ? "" : new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        if (status >= 400) throw new IOException("Cloudinary respondeu " + status + ": " + body);
        return objectMapper.readTree(body);
    }

    private void writeTextPart(OutputStream output, String boundary, String name, String value) throws IOException {
        output.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n")
                .getBytes(StandardCharsets.UTF_8));
    }

    private void writeFilePart(OutputStream output, String boundary, MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename() == null ? "image.jpg" : file.getOriginalFilename().replace("\"", "");
        String type = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
        output.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\nContent-Type: " + type + "\r\n\r\n")
                .getBytes(StandardCharsets.UTF_8));
        file.getInputStream().transferTo(output);
        output.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private boolean isCloudinaryUrl(String imageUrl) {
        return imageUrl.startsWith("https://res.cloudinary.com/");
    }

    private String publicIdFromCloudinaryUrl(String imageUrl) {
        try {
            String path = URI.create(imageUrl).getPath();
            int uploadIndex = path.indexOf("/upload/");
            if (uploadIndex < 0) return null;
            String value = path.substring(uploadIndex + "/upload/".length());
            value = value.replaceFirst("^v\\d+/", "");
            int extensionIndex = value.lastIndexOf('.');
            return extensionIndex > 0 ? value.substring(0, extensionIndex) : value;
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String cloudinaryErrorMessage(String message) {
        if (message == null || message.isBlank()) return "verifique as credenciais configuradas no Railway";
        try {
            int jsonStart = message.indexOf('{');
            if (jsonStart >= 0) {
                JsonNode error = objectMapper.readTree(message.substring(jsonStart));
                String detail = error.path("error").path("message").asText();
                if (!detail.isBlank()) return detail;
            }
        } catch (Exception ignored) { }
        return "verifique CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET";
    }
}
