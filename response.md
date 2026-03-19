# Temperature Test Results

**Prompt:** `Write a one-sentence story about a cat.`
**Date:** 2026-03-19

---

## Google Gemini

### Temperature = 0
| Run | Response |
|-----|----------|
| 1 | With a flick of its tail, the ginger cat surveyed its kingdom from the sun-drenched windowsill, a silent guardian of naps and mischief. |
| 2 | With a flick of its tail, the ginger cat surveyed its kingdom from the sun-drenched windowsill, a silent guardian of naps and mischief. |
| 3 | With a flick of its tail, the ginger cat surveyed its kingdom from the sun-drenched windowsill, a silent guardian of naps and mischief. |

### Temperature = 2
| Run | Response |
|-----|----------|
| 1 | Perched on the sun-drenched windowsill, the ginger tabby twitched its whiskers, contemplating the silent, unknowable world outside. |
| 2 | Perched on the sun-drenched windowsill, the ginger tabby surveyed his kingdom, a single, languid blink acknowledging the world's trivial demands. |
| 3 | Whiskers twitched as the ginger tabby surveyed his domain, the sunbeam warming his belly, before gracefully leaping to chase a fleeting dust mote. |

### Оценка (Gemini)

| Критерий | Temperature 0 | Temperature 2 | Изменение |
|----------|--------------|--------------|-----------|
| **Повторяемость** | Все 3 идентичны | Все 3 уникальны | ⬆️ Вариативность растёт |
| **Структура** | Фиксирована | Разная | ⬆️ Разнообразие |
| **Лексика** | "flick", "surveyed", "guardian" | "twitched", "contemplating", "languid" | ⬆️ Богаче |
| **Образы** | Кот-хранитель на подоконнике | Философия / лень / охота | ⬆️ Непредсказуемость |
| **Качество** | Стабильное | Живее, менее предсказуемо | ↔️ Зависит от задачи |

---

## DeepSeek

### Temperature = 0
| Run | Response |
|-----|----------|
| 1 | The curious cat, with eyes like twin moons, pounced upon the dancing sunbeam and captured the morning. |
| 2 | The curious cat, with eyes like twin moons, pounced upon the dancing sunbeam and captured the morning. |
| 3 | The curious cat, with eyes like twin moons, pounced upon the dancing sunbeam and captured the morning. |

### Temperature = 2
| Run | Response |
|-----|----------|
| 1 | The curious cat leapt from the fence, chasing a sunbeam that danced across the dusty floor until it vanished under the sofa, leaving only a twitching tail and purrs of satisfaction. |
| 2 | The sleepy tabby pawed a sunbeam onto the floor and curled into its warmth, purring a tiny, perfect circle of a story. |
| 3 | The cat stretched in the sunbeam, plotting the theft of another slice of leftover chicken from the kitchen counter. |

### Оценка (DeepSeek)

| Критерий | Temperature 0 | Temperature 2 | Изменение |
|----------|--------------|--------------|-----------|
| **Повторяемость** | Все 3 идентичны | Все 3 уникальны | ⬆️ Вариативность растёт |
| **Структура** | Фиксирована | Разная длина и синтаксис | ⬆️ Разнообразие |
| **Лексика** | "curious", "pounced", "captured" | "leapt", "plotting", "purring" | ⬆️ Богаче |
| **Образы** | Поэтичный — кот ловит луч солнца | Погоня / уют / юмор (кража курицы) | ⬆️ Шире диапазон тональностей |
| **Качество** | Лаконично, поэтично | Разнообразнее, иногда длиннее | ↔️ Зависит от задачи |

---

## Вывод

Оба провайдера корректно реагируют на температуру:
- `0` — **детерминированный** режим: ответы идентичны во всех запусках
- `2` — **максимальная энтропия**: каждый ответ уникален по структуре, лексике и образам

DeepSeek при `temperature=2` даёт более широкий диапазон **тональностей** (поэзия → юмор), Gemini варьирует преимущественно **структуру и детали**.
