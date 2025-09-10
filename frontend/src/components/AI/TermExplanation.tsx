import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Card, Typography, Spin, Alert, Tag, Space, Divider, message } from 'antd';
import { RobotOutlined, SearchOutlined, CloseOutlined, TranslationOutlined, BulbOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

interface TermExplanation {
  term: string;
  explanation: string;
  category: string;
  relatedTerms: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  examples?: string[];
}

interface TermExplanationModalProps {
  visible: boolean;
  onClose: () => void;
  lectureId?: string;
  selectedText?: string;
}

export const TermExplanationModal: React.FC<TermExplanationModalProps> = ({
  visible,
  onClose,
  lectureId,
  selectedText
}) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [explanation, setExplanation] = useState<TermExplanation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 初始化選中文本
  useEffect(() => {
    if (visible && selectedText) {
      setSearchTerm(selectedText);
      handleExplainTerm(selectedText);
    }
  }, [visible, selectedText]);

  // 載入搜尋歷史
  useEffect(() => {
    if (visible) {
      const history = localStorage.getItem('termSearchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    }
  }, [visible]);

  const handleExplainTerm = async (term: string) => {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/ai/explain-term', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          term: term.trim(),
          context: lectureId ? `來自講堂 ${lectureId}` : undefined,
          language: 'zh'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setExplanation(data);

      // 更新搜尋歷史
      const newHistory = [term, ...searchHistory.filter(t => t !== term)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('termSearchHistory', JSON.stringify(newHistory));

      message.success(`已解釋詞彙: ${term}`);

    } catch (error) {
      console.error('詞彙解釋錯誤:', error);
      setError('無法獲取詞彙解釋，請檢查網路連線或稍後再試');
      message.error('詞彙解釋失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      handleExplainTerm(value);
    }
  };

  const handleHistoryClick = (term: string) => {
    setSearchTerm(term);
    handleExplainTerm(term);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('termSearchHistory');
    message.success('搜尋歷史已清除');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'blue';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '簡單';
      case 'medium': return '中等';
      case 'hard': return '困難';
      default: return difficulty;
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setExplanation(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center">
          <RobotOutlined className="text-blue-500 mr-2" />
          <span>AI 詞彙解釋助手</span>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={700}
      className="term-explanation-modal"
      destroyOnClose
    >
      <div className="space-y-6">
        {/* 搜尋區域 */}
        <div>
          <Search
            placeholder="輸入學術詞彙進行解釋..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={handleSearch}
            loading={loading}
            size="large"
            enterButton={
              <Button type="primary" icon={<SearchOutlined />}>
                解釋
              </Button>
            }
            allowClear
          />

          {selectedText && (
            <div className="mt-2">
              <Text type="secondary" className="text-sm">
                選中文本: "{selectedText}"
              </Text>
            </div>
          )}
        </div>

        {/* 錯誤提示 */}
        {error && (
          <Alert
            message="解釋失敗"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 載入狀態 */}
        {loading && (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-4">
              <Text type="secondary">AI 正在分析詞彙...</Text>
            </div>
          </div>
        )}

        {/* 解釋結果 */}
        {explanation && !loading && (
          <div className="space-y-4">
            {/* 詞彙基本資訊 */}
            <Card size="small" className="bg-blue-50 border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <Title level={4} className="mb-1 text-blue-900">
                    {explanation.term}
                  </Title>
                  <Space>
                    <Tag color="blue">{explanation.category}</Tag>
                    <Tag color={getDifficultyColor(explanation.difficulty)}>
                      {getDifficultyText(explanation.difficulty)}
                    </Tag>
                  </Space>
                </div>
                <Button
                  type="text"
                  icon={<TranslationOutlined />}
                  size="small"
                  onClick={() => handleExplainTerm(explanation.term)}
                  title="重新解釋"
                />
              </div>
            </Card>

            {/* 詳細解釋 */}
            <Card title={<span className="flex items-center"><BulbOutlined className="mr-2" />詳細解釋</span>}>
              <Paragraph className="text-base leading-relaxed">
                {explanation.explanation}
              </Paragraph>
            </Card>

            {/* 相關詞彙 */}
            {explanation.relatedTerms && explanation.relatedTerms.length > 0 && (
              <Card title="相關詞彙">
                <Space wrap>
                  {explanation.relatedTerms.map((term, index) => (
                    <Button
                      key={index}
                      type="dashed"
                      size="small"
                      onClick={() => handleExplainTerm(term)}
                      className="hover:bg-blue-50"
                    >
                      {term}
                    </Button>
                  ))}
                </Space>
              </Card>
            )}

            {/* 應用例子 */}
            {explanation.examples && explanation.examples.length > 0 && (
              <Card title="應用例子">
                <ul className="space-y-2">
                  {explanation.examples.map((example, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2 mt-1">•</span>
                      <Text>{example}</Text>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* 搜尋歷史 */}
        {searchHistory.length > 0 && !explanation && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <Text strong className="text-base">搜尋歷史</Text>
              <Button
                type="link"
                size="small"
                onClick={clearHistory}
                danger
              >
                清除歷史
              </Button>
            </div>
            <Space wrap>
              {searchHistory.slice(0, 10).map((term, index) => (
                <Button
                  key={index}
                  type="default"
                  size="small"
                  onClick={() => handleHistoryClick(term)}
                  className="hover:bg-gray-100"
                >
                  {term}
                </Button>
              ))}
            </Space>
          </div>
        )}

        {/* 使用提示 */}
        {!explanation && !loading && (
          <Card className="bg-gray-50" size="small">
            <div className="text-center">
              <RobotOutlined className="text-2xl text-gray-400 mb-2" />
              <div>
                <Text strong>AI 詞彙解釋助手</Text>
              </div>
              <div className="mt-2">
                <Text type="secondary">
                  輸入任何學術詞彙，AI 將為您提供詳細的解釋、相關概念和應用例子
                </Text>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default TermExplanationModal;
