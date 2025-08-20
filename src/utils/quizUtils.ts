import type { FirebaseQuestion } from '../services/firebaseService';
import { isEqual } from 'lodash';

export const checkAnswer = (question: FirebaseQuestion, userAnswer: any): boolean => {
    if (userAnswer === undefined || userAnswer === null) return false;
    
    // lodash's isEqual is great for deep equality checks, but for sorted arrays, a string comparison is safer.
    const sortedUserAnswer = Array.isArray(userAnswer) ? [...userAnswer].sort() : userAnswer;
    const sortedCorrectAnswer = Array.isArray(question.correctAnswer) ? [...question.correctAnswer].sort() : question.correctAnswer;

    switch (question.type) {
        case 'multiple_choice_single':
        case 'true_false':
            return userAnswer === question.correctAnswer;
        case 'fill_in_blank':
            return typeof userAnswer === 'string' && userAnswer.trim() === question.correctAnswer;
        case 'multiple_choice_multiple':
            // Check if they are arrays and have the same content regardless of order
            return Array.isArray(sortedUserAnswer) && Array.isArray(sortedCorrectAnswer) && 
                   isEqual(sortedUserAnswer, sortedCorrectAnswer);
        default:
            return false;
    }
};