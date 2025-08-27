# 团餐菜单生成工具 - 国内部署指南

## 🚀 部署方案概述

由于Vercel在国内访问存在问题，我们提供了以下国内友好的部署方案：

### 方案选择建议

1. **阿里云/腾讯云服务器（推荐）** - 稳定可靠，成本适中
2. **本地服务器** - 成本最低，需要固定IP
3. **容器化云服务** - 如阿里云容器实例等

## 📋 部署前准备

### 1. 环境要求
- Docker & Docker Compose
- 服务器或VPS（建议2GB内存以上）
- 域名（可选，用于HTTPS访问）

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量文件
nano .env
```

需要配置的变量：
- `NEXTAUTH_SECRET`: JWT密钥（随机字符串）
- `DEEPSEEK_API_KEY`: 你的Deepseek API密钥
- `DATABASE_URL`: 数据库连接（默认使用SQLite）

## 🛠 快速部署

### 使用自动化脚本
```bash
# 运行部署脚本
./deploy.sh
```

### 手动部署步骤

1. **构建镜像**
```bash
docker build -t ai-menu-app .
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **检查状态**
```bash
docker-compose ps
docker-compose logs app
```

## 🌐 云服务器部署指南

### 阿里云ECS部署

1. **购买ECS实例**
   - 选择2GB内存以上的实例
   - 系统建议选择Ubuntu 20.04+

2. **安装Docker**
```bash
# 更新包列表
sudo apt update

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **上传代码**
```bash
# 使用git克隆（如果代码在仓库中）
git clone <your-repo-url>
cd ai-menu-040

# 或者直接上传文件到服务器
```

4. **配置域名和SSL**
   - 在域名提供商处添加A记录指向服务器IP
   - 申请SSL证书（可使用Let's Encrypt）

### 腾讯云CVM部署

类似阿里云，步骤基本相同。

## 🔧 高级配置

### 使用Nginx反向代理

如果需要HTTPS访问，可以启用Nginx服务：

1. **获取SSL证书**
```bash
# 创建SSL目录
mkdir ssl
# 将你的证书文件放入ssl目录
# cert.pem - 证书文件
# key.pem - 私钥文件
```

2. **修改nginx.conf**
```bash
# 编辑nginx.conf，替换your-domain.com为你的域名
nano nginx.conf
```

3. **启动带Nginx的完整服务**
```bash
docker-compose up -d
```

### 数据备份

定期备份SQLite数据库：
```bash
# 创建备份脚本
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp prisma/dev.db backups/dev_${DATE}.db
# 保留最近30天的备份
find backups/ -name "dev_*.db" -mtime +30 -delete
EOF

chmod +x backup.sh

# 添加到crontab（每天备份）
echo "0 2 * * * /path/to/your/backup.sh" | crontab -
```

## 🔍 监控和维护

### 查看日志
```bash
# 查看应用日志
docker-compose logs -f app

# 查看Nginx日志
docker-compose logs -f nginx
```

### 更新应用
```bash
# 拉取新代码
git pull

# 重新部署
./deploy.sh
```

### 性能监控
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
df -h
```

## 🚨 故障排除

### 常见问题

1. **端口占用**
```bash
# 检查端口占用
sudo netstat -tlnp | grep :3000
# 杀死占用进程
sudo kill -9 <PID>
```

2. **权限问题**
```bash
# 给予Docker权限
sudo usermod -aG docker $USER
# 重新登录生效
```

3. **内存不足**
```bash
# 查看内存使用
free -h
# 清理Docker缓存
docker system prune -a
```

## 📈 性能优化建议

1. **服务器配置**
   - 建议4GB内存以上
   - SSD硬盘
   - 良好的网络带宽

2. **应用优化**
   - 启用Gzip压缩
   - 配置CDN（如阿里云CDN）
   - 数据库索引优化

3. **监控设置**
   - 配置服务器监控
   - 设置告警通知
   - 定期性能检查

## 💰 成本估算

### 阿里云ECS（参考价格）
- 2GB内存服务器：约100-200元/月
- 域名：约50-100元/年
- SSL证书：免费（Let's Encrypt）

### 总计：约100-200元/月运行成本

## 📞 技术支持

如果在部署过程中遇到问题，请检查：
1. 环境变量配置是否正确
2. 网络连接是否正常
3. Docker服务是否运行正常
4. 日志中的错误信息
