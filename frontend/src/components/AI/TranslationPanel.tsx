import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Typography, Space, Spin, Alert, Switch, Divider } from 'antd';
import { TranslationOutlined, SyncOutlined, GlobalOutlined, SoundOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface TranslationResult {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  confidence: number;
}

interface TranslationPanelProps {
  text: string;
  onTranslationUpdate?: (translation: string) => void;
  autoTranslate?: boolean;
  compact?: boolean;
}

export const TranslationPanel: React.FC<TranslationPanelProps> = ({
  text,
  onTranslationUpdate,
  autoTranslate = false,
  compact = false
}) => {
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromLanguage, setFromLanguage] = useState('en');
  const [toLanguage, setToLanguage] = useState('zh-Hans');
  const [isAutoTranslate, setIsAutoTranslate] = useState(autoTranslate);
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>([]);

  // 載入支援語言列表
  useEffect(() => {
    loadSupportedLanguages();
  }, []);

  // 自動翻譯
  useEffect(() => {
    if (isAutoTranslate && text && text.trim()) {
      handleTranslate(text);
    }
  }, [text, isAutoTranslate, fromLanguage, toLanguage]);

  const loadSupportedLanguages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/ai/supported-languages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSupportedLanguages(data.languages);
      }
    } catch (error) {
      console.error('載入語言列表錯誤:', error);
      // 使用預設語言列表
      setSupportedLanguages(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko', 'fr', 'de', 'es']);
    }
  };

  const handleTranslate = async (textToTranslate: string) => {
    if (!textToTranslate.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/ai/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToTranslate,
          fromLanguage,
          toLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = data.translation;
      setTranslation(result);

      // 通知父組件
      if (onTranslationUpdate) {
        onTranslationUpdate(result.translatedText);
      }

    } catch (error) {
      console.error('翻譯錯誤:', error);
      setError('翻譯失敗，請檢查網路連線或稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageSwap = () => {
    const temp = fromLanguage;
    setFromLanguage(toLanguage);
    setToLanguage(temp);

    // 如果有翻譯結果，交換並重新翻譯
    if (translation) {
      setTranslation(null);
      if (text) {
        handleTranslate(text);
      }
    }
  };

  const getLanguageName = (code: string) => {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'zh-Hans': '中文(簡體)',
      'zh-Hant': '中文(繁體)',
      'ja': '日本語',
      'ko': '한국어',
      'fr': 'Français',
      'de': 'Deutsch',
      'es': 'Español',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
    };
    return languageNames[code] || code;
  };

  const handleManualTranslate = () => {
    if (text && text.trim()) {
      handleTranslate(text);
    }
  };

  if (compact) {
    return (
      <div className="translation-compact">
        {translation && (
          <div className="text-sm">
            <Text type="secondary">{translation.translatedText}</Text>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      size="small"
      className="translation-panel"
      title={
        <div className="flex items-center">
          <TranslationOutlined className="mr-2 text-blue-500" />
          <span>即時翻譯</span>
        </div>
      }
      extra={
        <Space>
          <Text type="secondary" className="text-sm">自動翻譯</Text>
          <Switch
            size="small"
            checked={isAutoTranslate}
            onChange={setIsAutoTranslate}
          />
        </Space>
      }
    >
      <div className="space-y-4">
        {/* 語言選擇 */}
        <div className="flex items-center space-x-2">
          <Select
            value={fromLanguage}
            onChange={setFromLanguage}
            style={{ width: 120 }}
            size="small"
            disabled={loading}
          >
            {supportedLanguages.map(lang => (
              <Option key={lang} value={lang}>
                {getLanguageName(lang)}
              </Option>
            ))}
          </Select>

          <Button
            type="text"
            icon={<SyncOutlined />}
            onClick={handleLanguageSwap}
            size="small"
            disabled={loading}
            title="交換語言"
          />

          <Select
            value={toLanguage}
            onChange={setToLanguage}
            style={{ width: 120 }}
            size="small"
            disabled={loading}
          >
            {supportedLanguages.map(lang => (
              <Option key={lang} value={lang}>
                {getLanguageName(lang)}
              </Option>
            ))}
          </Select>

          {!isAutoTranslate && (
            <Button
              type="primary"
              size="small"
              onClick={handleManualTranslate}
              loading={loading}
              disabled={!text || !text.trim()}
            >
              翻譯
            </Button>
          )}
        </div>

        {/* 原文顯示 */}
        {text && (
          <div>
            <div className="flex items-center mb-1">
              <GlobalOutlined className="mr-2 text-gray-400" />
              <Text type="secondary" className="text-sm">原文</Text>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <Text>{text}</Text>
            </div>
          </div>
        )}

        {/* 載入狀態 */}
        {loading && (
          <div className="text-center py-4">
            <Spin size="small" />
            <div className="mt-2">
              <Text type="secondary" className="text-sm">正在翻譯...</Text>
            </div>
          </div>
        )}

        {/* 錯誤提示 */}
        {error && (
          <Alert
            message="翻譯失敗"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 翻譯結果 */}
        {translation && !loading && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <SoundOutlined className="mr-2 text-green-500" />
                <Text type="secondary" className="text-sm">翻譯結果</Text>
              </div>
              <Text type="secondary" className="text-xs">
                信心度: {Math.round(translation.confidence * 100)}%
              </Text>
            </div>
            <div className="bg-green-50 p-3 rounded border border-green-200">
              <Text className="text-green-800">{translation.translatedText}</Text>
            </div>
          </div>
        )}

        {/* 空狀態 */}
        {!text && !translation && !loading && (
          <div className="text-center py-6 text-gray-500">
            <TranslationOutlined className="text-2xl mb-2" />
            <div>
              <Text type="secondary">等待翻譯內容...</Text>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TranslationPanel;
