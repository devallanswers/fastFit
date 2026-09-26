# Evolution API Integration - FFstore Backend

## ✅ Checklist de Implementação

- [x] Bean RestTemplate criado em `WebConfig.java`
- [x] DTOs criados em `WhatsAppRequests.java`
- [x] `WhatsAppService.java` refatorado com melhor tratamento de erros
- [x] Configurações adicionadas em `application.properties`
- [x] Documentação completa criada
- [x] Exemplos práticos criados para notificações de status

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

#### Opção A: Arquivo `.env` (Local Development)
```bash
# .env na raiz do projeto
EVOLUTION_API_URL=http://localhost:3000
EVOLUTION_API_KEY=sua_chave_de_api_aqui
EVOLUTION_INSTANCE=fastfit
EVOLUTION_API_ENABLED=true
```

#### Opção B: Docker Compose
```yaml
environment:
  - EVOLUTION_API_URL=http://evolution-api:3000
  - EVOLUTION_API_KEY=sk_test_sua_chave
  - EVOLUTION_INSTANCE=fastfit
  - EVOLUTION_API_ENABLED=true
```

#### Opção C: Variáveis do Sistema (Produção)
```bash
# Linux/Mac - adicione ao ~/.bash_profile ou ~/.zshrc
export EVOLUTION_API_URL="http://localhost:3000"
export EVOLUTION_API_KEY="sua_chave_aqui"
export EVOLUTION_INSTANCE="fastfit"
export EVOLUTION_API_ENABLED="true"
```

### 2. Integração em OrderService

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final WhatsAppNotificationExamples whatsAppNotifications;

    public OrderService(OrderRepository orderRepository, WhatsAppNotificationExamples whatsAppNotifications) {
        this.orderRepository = orderRepository;
        this.whatsAppNotifications = whatsAppNotifications;
    }

    // Atualizar status do pedido e notificar cliente
    public void updateOrderStatus(Long orderId, Order.OrderStatus newStatus) {
        Order order = orderRepository.findById(orderId).orElseThrow();
        order.setStatus(newStatus);
        orderRepository.save(order);

        // Enviar notificação automática
        switch (newStatus) {
            case RECEIVED:
                whatsAppNotifications.notifyOrderReceived(order);
                break;
            case IN_PREPARATION:
                whatsAppNotifications.notifyOrderInPreparation(order);
                break;
            case READY:
                whatsAppNotifications.notifyOrderReady(order);
                break;
            case FINISHED:
                whatsAppNotifications.notifyOrderFinished(order);
                break;
            case CANCELED:
                whatsAppNotifications.notifyOrderCancelled(order, "Motivo do cancelamento");
                break;
        }
    }
}
```

### 3. Métodos Disponíveis

```java
// Status: Recebido
whatsAppNotifications.notifyOrderReceived(order);

// Status: Em Preparação
whatsAppNotifications.notifyOrderInPreparation(order);

// Status: Saiu para Entrega
whatsAppNotifications.notifyOrderReady(order);

// Status: Entregue
whatsAppNotifications.notifyOrderFinished(order);

// Status: Cancelado
whatsAppNotifications.notifyOrderCancelled(order, "Motivo aqui");
```

## 🔧 Configurações Avançadas

### Alterar Timeouts

Edite `WebConfig.java`:

```java
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
            .setConnectTimeout(Duration.ofSeconds(15))  // Aumentado
            .setReadTimeout(Duration.ofSeconds(20))
            .requestFactory(this::clientHttpRequestFactory)
            .build();
}
```

### Desabilitar Serviço Sem Remover Código

```properties
evolution.api.enabled=false
# Mensagens não serão enviadas, apenas registradas no log
```

## 📋 Validação do Setup

### 1. Verificar Propriedades

```java
@RestController
public class DebugController {

    @Autowired
    private WhatsAppService whatsAppService;

    @GetMapping("/api/debug/whatsapp")
    public ResponseEntity<String> checkWhatsApp() {
        return ResponseEntity.ok(whatsAppService.getConfigurationInfo());
    }
}
```

Acesse: `http://localhost:8080/api/debug/whatsapp`

### 2. Testar Envio

```java
@Test
public void testWhatsAppSend() {
    whatsAppService.sendText("5585999999999", "Teste");
    // Verifique os logs para confirmar
}
```

## ⚠️ Troubleshooting

### "Evolution API URL não configurada"

**Problema:** Variável `EVOLUTION_API_URL` não foi definida

**Solução:**
```bash
# Verificar se a variável está definida
echo $EVOLUTION_API_URL

# Se vazio, definir:
export EVOLUTION_API_URL=http://localhost:3000
```

### "Erro de autenticação (401)"

**Problema:** API Key está incorreta ou expirou

**Solução:**
1. Verifique a chave na Evolution API
2. Renove a chave se necessário
3. Atualize `EVOLUTION_API_KEY`

### "Erro (404) - Endpoint não encontrado"

**Problema:** `EVOLUTION_API_URL` ou instância incorreta

**Solução:**
```bash
# Verificar formato correto
# ❌ Errado: http://localhost:3000/message/sendText/fastfit
# ✓ Certo: http://localhost:3000

# A URL NÃO deve incluir /message/sendText no final
```

### Mensagens não são enviadas (silenciosamente)

**Verificar logs:**
```bash
# Se estiver usando Spring Boot
# Ativar logs de DEBUG
logging.level.com.fastfit.backend.service.WhatsAppService=DEBUG
```

## 📊 Estrutura de Arquivos

```
fastfit-backend/
├── src/main/java/com/fastfit/backend/
│   ├── config/
│   │   └── WebConfig.java                    # Bean RestTemplate
│   ├── dto/request/
│   │   └── WhatsAppRequests.java             # DTOs
│   ├── service/
│   │   ├── WhatsAppService.java              # Serviço principal
│   │   └── example/
│   │       └── WhatsAppNotificationExamples.java
│   └── ...
├── src/main/resources/
│   └── application.properties                 # Configurações
├── EVOLUTION_API_INTEGRATION.txt             # Documentação
└── ...
```

## 🔐 Segurança

### Proteger API Key

**❌ Não faça:**
```java
// Nunca commitar chaves no código
@Value("${evolution.api.key:sk_test_hardcoded}")  // NUNCA!
```

**✓ Faça:**
```bash
# Use variáveis de ambiente
export EVOLUTION_API_KEY="chave_real_aqui"

# Em produção, use secret manager:
# - AWS Secrets Manager
# - Google Cloud Secret Manager
# - Kubernetes Secrets
# - HashiCorp Vault
```

### Logs Seguros

O serviço não loga a chave de API, apenas erros genéricos.

## 📈 Performance

- **Connection Timeout:** 5 segundos
- **Read Timeout:** 10 segundos
- **Sem bloqueio:** Erros de API não derrubam a aplicação

## 🧪 Testando Localmente

### Com Docker Compose

```bash
# Subir Evolution API localmente
docker-compose up -d evolution-api

# Testar conexão
curl -X GET http://localhost:3000/instances
```

### Simular Requests

```bash
# Testar endpoint
curl -X POST http://localhost:3000/message/sendText/fastfit \
  -H "Content-Type: application/json" \
  -H "apikey: sua_chave" \
  -d '{
    "number": "5585999999999",
    "text": "Teste"
  }'
```

## 📞 Suporte

Para dúvidas sobre a Evolution API, consulte:
- Documentação Oficial: https://evolution-api.com/docs
- GitHub: https://github.com/EvolutionAPI/evolution-api
