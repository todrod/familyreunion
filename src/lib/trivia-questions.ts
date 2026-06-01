export interface TriviaQuestion {
  question: string;
  options: [string, string, string, string]; // A, B, C, D
  answer: "A" | "B" | "C" | "D";
  category: string;
}

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Family & Reunion
  {
    question: "What year is this Aversa Family Reunion?",
    options: ["12th", "13th", "14th", "15th"],
    answer: "C",
    category: "Reunion",
  },
  {
    question: "Where is the 2026 reunion being held?",
    options: ["Hoboken, NJ", "Old Bridge, NJ", "Princeton, NJ", "Edison, NJ"],
    answer: "B",
    category: "Reunion",
  },
  {
    question: "What hotel is hosting the reunion?",
    options: ["Marriott", "Hilton Garden Inn", "Hampton Inn", "Holiday Inn"],
    answer: "C",
    category: "Reunion",
  },
  {
    question: "What state is New Jersey famous for being called?",
    options: ["The Garden State", "The Shore State", "The Pine State", "The Empire State"],
    answer: "A",
    category: "Reunion",
  },
  {
    question: "Which is the traditional food at Italian-American family gatherings?",
    options: ["Tacos", "Sunday Gravy", "Fish and Chips", "Pierogi"],
    answer: "B",
    category: "Family",
  },
  {
    question: "What does 'Aversa' mean in Italian?",
    options: ["Mountain", "Opposite / adversary", "River", "Star"],
    answer: "B",
    category: "Family",
  },
  // Pop Culture / Fun
  {
    question: "Which of these is a real New Jersey landmark?",
    options: ["The Alamo", "The Jersey Shore Boardwalk", "Alcatraz", "The Space Needle"],
    answer: "B",
    category: "NJ",
  },
  {
    question: "What famous musician is from Asbury Park, NJ?",
    options: ["Jon Bon Jovi", "Bruce Springsteen", "Frank Sinatra", "Both A and B"],
    answer: "D",
    category: "NJ",
  },
  {
    question: "Frank Sinatra was born in which NJ city?",
    options: ["Newark", "Jersey City", "Hoboken", "Trenton"],
    answer: "C",
    category: "NJ",
  },
  {
    question: "The TV show 'The Sopranos' was set in which state?",
    options: ["New York", "Connecticut", "New Jersey", "Pennsylvania"],
    answer: "C",
    category: "Pop Culture",
  },
  {
    question: "How many stripes are on the American flag?",
    options: ["12", "13", "14", "15"],
    answer: "B",
    category: "General",
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    answer: "D",
    category: "General",
  },
  {
    question: "How many players are on a standard basketball team on the court?",
    options: ["4", "5", "6", "7"],
    answer: "B",
    category: "Sports",
  },
  {
    question: "In what year did the Titanic sink?",
    options: ["1905", "1912", "1918", "1923"],
    answer: "B",
    category: "History",
  },
  {
    question: "What is the capital of Italy?",
    options: ["Milan", "Venice", "Florence", "Rome"],
    answer: "D",
    category: "Geography",
  },
  {
    question: "What does 'pizza' mean in Italian?",
    options: ["Pie", "Flat bread", "Point / bite", "Cheese"],
    answer: "C",
    category: "Food",
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    answer: "B",
    category: "General",
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Saturn", "Jupiter", "Mars"],
    answer: "D",
    category: "General",
  },
  {
    question: "What is the most popular sport in the world?",
    options: ["Basketball", "Cricket", "Soccer (Football)", "Tennis"],
    answer: "C",
    category: "Sports",
  },
  {
    question: "What language has the most native speakers worldwide?",
    options: ["English", "Spanish", "Mandarin Chinese", "Hindi"],
    answer: "C",
    category: "General",
  },
];
