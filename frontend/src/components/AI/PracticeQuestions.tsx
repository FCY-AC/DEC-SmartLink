import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Typography, Space, Spin, Alert, Radio, Divider, Progress, message, Badge } from 'antd';
import { QuestionCircleOutlined, RobotOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Group: RadioGroup } = Radio;

interface PracticeQuestion {
  id: string;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface PracticeQuestionsProps {
  lectureId: string;
  lectureContent?: string;
  onScoreUpdate?: (score: number, total: number) => void;
}

export const PracticeQuestions: React.FC<PracticeQuestionsProps> = ({
  lectureId,
  lectureContent,
  onScoreUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);

  // 生成練習題
  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);

    try {
      const token = localStorage.getItem('token');
      const content = lectureContent || `這是一個關於講堂 ${lectureId} 的練習題生成請求`;

      const response = await fetch('/api/v1/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureContent: content,
          count: questionCount,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setQuestions(data.questions);

      message.success(`已生成 ${data.questions.length} 道練習題`);

    } catch (error) {
      console.error('生成練習題錯誤:', error);
      setError('生成練習題失敗，請檢查網路連線或稍後再試');
      message.error('生成練習題失敗');
    } finally {
      setLoading(false);
    }
  };

  // 提交答案
  const handleAnswerSelect = (questionId: string, answer: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // 計算分數
  const calculateScore = () => {
    let totalScore = 0;
    questions.forEach(question => {
      const selectedAnswer = selectedAnswers[question.id];
      if (selectedAnswer === question.correctAnswer) {
        totalScore += question.points;
      }
    });

    setScore(totalScore);
    setShowResults(true);

    // 通知父組件
    if (onScoreUpdate) {
      onScoreUpdate(totalScore, questions.reduce((sum, q) => sum + q.points, 0));
    }

    message.success(`測驗完成！得分: ${totalScore}/${questions.reduce((sum, q) => sum + q.points, 0)}`);
  };

  // 重新開始
  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
  };

  // 獲取難度標籤顏色
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'blue';
    }
  };

  // 獲取難度文字
  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '簡單';
      case 'medium': return '中等';
      case 'hard': return '困難';
      default: return difficulty;
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <Card
      className="practice-questions"
      title={
        <div className="flex items-center">
          <QuestionCircleOutlined className="mr-2 text-purple-500" />
          <span>AI 智慧練習</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 設定區域 */}
        {!questions.length && !loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Text strong className="block mb-2">難度等級</Text>
                <Select
                  value={difficulty}
                  onChange={setDifficulty}
                  style={{ width: '100%' }}
                >
                  <Option value="easy">
                    <Badge color="green" text="簡單" />
                  </Option>
                  <Option value="medium">
                    <Badge color="orange" text="中等" />
                  </Option>
                  <Option value="hard">
                    <Badge color="red" text="困難" />
                  </Option>
                </Select>
              </div>

              <div>
                <Text strong className="block mb-2">題目數量</Text>
                <Select
                  value={questionCount}
                  onChange={setQuestionCount}
                  style={{ width: '100%' }}
                >
                  <Option value={3}>3題</Option>
                  <Option value={5}>5題</Option>
                  <Option value={10}>10題</Option>
                  <Option value={15}>15題</Option>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={generateQuestions}
                  loading={loading}
                  block
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  生成練習題
                </Button>
              </div>
            </div>

            <Alert
              message="AI 智慧練習"
              description="系統將根據講堂內容自動生成個人化的練習題，幫助您鞏固學習成果。"
              type="info"
              showIcon
            />
          </div>
        )}

        {/* 載入狀態 */}
        {loading && (
          <div className="text-center py-8">
            <Spin size="large" />
            <div className="mt-4">
              <Text type="secondary">AI 正在生成練習題...</Text>
            </div>
          </div>
        )}

        {/* 錯誤提示 */}
        {error && (
          <Alert
            message="生成失敗"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* 測驗區域 */}
        {questions.length > 0 && !showResults && (
          <div className="space-y-6">
            {/* 進度條 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Text strong>題目進度</Text>
                <Text type="secondary">
                  {currentQuestionIndex + 1} / {questions.length}
                </Text>
              </div>
              <Progress percent={progress} showInfo={false} />
            </div>

            {/* 當前題目 */}
            <Card className="question-card">
              <div className="space-y-4">
                {/* 題目資訊 */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Title level={5} className="mb-2">
                      {currentQuestion.questionText}
                    </Title>
                    <Space>
                      <Badge color={getDifficultyColor(currentQuestion.difficulty)}>
                        {getDifficultyText(currentQuestion.difficulty)}
                      </Badge>
                      <Text type="secondary" className="text-sm">
                        {currentQuestion.points} 分
                      </Text>
                    </Space>
                  </div>
                </div>

                {/* 選項 */}
                {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
                  <RadioGroup
                    value={selectedAnswers[currentQuestion.id]}
                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    className="w-full"
                  >
                    <Space direction="vertical" className="w-full">
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="w-full">
                          <Radio value={String.fromCharCode(65 + index)} className="w-full">
                            <div className="ml-2 p-2 rounded border hover:bg-gray-50 cursor-pointer w-full">
                              <Text>{option}</Text>
                            </div>
                          </Radio>
                        </div>
                      ))}
                    </Space>
                  </RadioGroup>
                )}

                {/* 簡答題 */}
                {currentQuestion.questionType === 'short_answer' && (
                  <div>
                    <Text type="secondary" className="block mb-2">請輸入您的答案：</Text>
                    <textarea
                      className="w-full p-3 border rounded resize-none"
                      rows={3}
                      placeholder="請輸入答案..."
                      value={selectedAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    />
                  </div>
                )}

                {/* 論述題 */}
                {currentQuestion.questionType === 'essay' && (
                  <div>
                    <Text type="secondary" className="block mb-2">請詳細論述：</Text>
                    <textarea
                      className="w-full p-3 border rounded resize-none"
                      rows={6}
                      placeholder="請詳細論述您的觀點..."
                      value={selectedAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* 導航按鈕 */}
            <div className="flex justify-between">
              <Button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              >
                上一題
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  type="primary"
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                >
                  下一題
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={calculateScore}
                  disabled={Object.keys(selectedAnswers).length < questions.length}
                >
                  提交測驗
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 結果顯示 */}
        {showResults && (
          <div className="space-y-6">
            {/* 分數總結 */}
            <Card className="text-center bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="space-y-4">
                <div>
                  <Title level={3} className="text-purple-600 mb-0">
                    {score} / {totalPoints}
                  </Title>
                  <Text type="secondary">測驗得分</Text>
                </div>

                <div className="flex justify-center">
                  <Progress
                    type="circle"
                    percent={Math.round((score / totalPoints) * 100)}
                    width={120}
                    strokeColor={{
                      '0%': '#ff4d4f',
                      '50%': '#faad14',
                      '100%': '#52c41a',
                    }}
                  />
                </div>

                <Text className="text-lg">
                  {score >= totalPoints * 0.8 ? '🎉 表現優秀！' :
                   score >= totalPoints * 0.6 ? '👍 表現良好！' :
                   '💪 繼續努力！'}
                </Text>
              </div>
            </Card>

            {/* 題目詳解 */}
            <div className="space-y-4">
              <Title level={4}>題目詳解</Title>
              {questions.map((question, index) => (
                <Card key={question.id} size="small">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Text strong className="block">
                          {index + 1}. {question.questionText}
                        </Text>
                        <Space className="mt-1">
                          <Badge color={getDifficultyColor(question.difficulty)}>
                            {getDifficultyText(question.difficulty)}
                          </Badge>
                          <Text type="secondary" className="text-sm">
                            {question.points} 分
                          </Text>
                        </Space>
                      </div>
                      <div className="flex items-center ml-4">
                        {selectedAnswers[question.id] === question.correctAnswer ? (
                          <CheckCircleOutlined className="text-green-500 text-lg" />
                        ) : (
                          <CloseCircleOutlined className="text-red-500 text-lg" />
                        )}
                      </div>
                    </div>

                    {/* 顯示用戶答案和正確答案 */}
                    {question.questionType === 'multiple_choice' && (
                      <div className="space-y-2">
                        <div>
                          <Text type="secondary" className="text-sm">您的答案: </Text>
                          <Text className={selectedAnswers[question.id] === question.correctAnswer ? 'text-green-600' : 'text-red-600'}>
                            {selectedAnswers[question.id] || '未作答'}
                          </Text>
                        </div>
                        <div>
                          <Text type="secondary" className="text-sm">正確答案: </Text>
                          <Text className="text-green-600 font-medium">
                            {question.correctAnswer}
                          </Text>
                        </div>
                      </div>
                    )}

                    {/* 解釋 */}
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      <Text strong className="text-blue-900 block mb-1">解析</Text>
                      <Text className="text-blue-800">{question.explanation}</Text>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* 重新開始按鈕 */}
            <div className="text-center">
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={restartQuiz}
                size="large"
              >
                重新練習
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PracticeQuestions;
